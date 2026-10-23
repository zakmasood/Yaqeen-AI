"""Postgres stand-in for the handful of Supabase calls the API makes.

ponytail: this covers select/insert/update/eq/in/is/gt/order/limit and the
embeds the services already request. It is not a PostgREST clone.
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any
from uuid import UUID

_IDENT = re.compile(r"^[a-z_][a-z0-9_]*$")

# (local column, other table, other column, one-to-many)
_EMBEDS: dict[tuple[str, str], tuple[str, str, str, bool]] = {
    ("analyses", "orders"): ("order_id", "orders", "id", False),
    ("analyses", "extracted_transactions"): ("id", "extracted_transactions", "analysis_id", True),
    ("analyses", "risk_signals"): ("id", "risk_signals", "analysis_id", True),
    ("analyses", "screenshots"): ("id", "screenshots", "analysis_id", True),
    ("proof_invites", "orders"): ("order_id", "orders", "id", False),
    ("proof_invites", "merchants"): ("merchant_id", "merchants", "id", False),
    ("merchant_users", "merchants"): ("merchant_id", "merchants", "id", False),
}


class Result:
    def __init__(self, data: Any) -> None:
        self.data = data


def _ident(name: str) -> str:
    if not _IDENT.match(name):
        raise ValueError(f"Unsafe column {name}")
    return name


def _cell(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    return value


def _row(record: dict) -> dict:
    return {key: _cell(value) for key, value in record.items()}


def parse_select(spec: str) -> tuple[bool, list[str], list[str]]:
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for char in spec:
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        if char == "," and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(char)
    if buf:
        parts.append("".join(buf).strip())
    star = False
    columns: list[str] = []
    embeds: list[str] = []
    for part in parts:
        if not part:
            continue
        if part == "*":
            star = True
        elif "(" in part:
            embeds.append(part.split("(", 1)[0].split("!", 1)[0].strip())
        else:
            columns.append(part)
    return star, columns, embeds


class Query:
    def __init__(self, url: str, table: str) -> None:
        self._url = url
        self._table = _ident(table)
        self._op = "select"
        self._spec = "*"
        self._filters: list[tuple[str, str, Any]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._payload: dict | list | None = None
        self._rpc: tuple[str, dict] | None = None

    def select(self, spec: str) -> Query:
        self._spec = spec
        return self

    def eq(self, column: str, value: Any) -> Query:
        self._filters.append((_ident(column), "eq", value))
        return self

    def in_(self, column: str, values: list) -> Query:
        self._filters.append((_ident(column), "in", list(values)))
        return self

    def is_(self, column: str, value: str) -> Query:
        self._filters.append((_ident(column), "is", value))
        return self

    def gt(self, column: str, value: Any) -> Query:
        self._filters.append((_ident(column), "gt", value))
        return self

    def order(self, column: str, desc: bool = False) -> Query:
        self._order = (_ident(column), desc)
        return self

    def limit(self, count: int) -> Query:
        self._limit = count
        return self

    def insert(self, payload: dict | list) -> Query:
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict) -> Query:
        self._op = "update"
        self._payload = payload
        return self

    def execute(self) -> Result:
        if self._rpc:
            return Result(self._call_rpc())
        if self._op == "insert":
            return Result(self._insert())
        if self._op == "update":
            return Result(self._update())
        return Result(self._select())

    def _connect(self):
        import psycopg
        from psycopg.rows import dict_row

        return psycopg.connect(self._url, row_factory=dict_row, autocommit=True)

    def _where(self) -> tuple[str, list]:
        clauses: list[str] = []
        params: list[Any] = []
        for column, op, value in self._filters:
            if op == "eq":
                if value is None:
                    clauses.append(f"{column} is null")
                elif isinstance(value, bool):
                    clauses.append(f"{column} = %s")
                    params.append(value)
                else:
                    clauses.append(f"{column}::text = %s")
                    params.append(str(value))
            elif op == "in":
                wanted = [str(item) for item in value]
                if not wanted:
                    clauses.append("false")
                else:
                    clauses.append(f"{column}::text = any(%s)")
                    params.append(wanted)
            elif op == "is" and value == "null":
                clauses.append(f"{column} is null")
            elif op == "gt":
                clauses.append(f"{column} > %s::timestamptz")
                params.append(value)
            else:
                raise ValueError(f"Unsupported filter {op}")
        if not clauses:
            return "", params
        return " where " + " and ".join(clauses), params

    def _select(self) -> list[dict]:
        star, columns, embeds = parse_select(self._spec)
        chosen = ["*"] if star or not columns else [_ident(column) for column in columns]
        if not star:
            for name in embeds:
                local, _, _, _ = _EMBEDS[(self._table, name)]
                if local not in chosen:
                    chosen.append(local)
        where, params = self._where()
        sql = f"select {', '.join(chosen)} from {self._table}{where}"
        if self._order:
            column, desc = self._order
            sql += f" order by {column} {'desc' if desc else 'asc'}"
        if self._limit is not None:
            sql += " limit %s"
            params.append(self._limit)
        with self._connect() as conn:
            rows = [_row(record) for record in conn.execute(sql, params).fetchall()]
            for name in embeds:
                self._attach(conn, rows, name)
        return rows

    def _attach(self, conn, rows: list[dict], name: str) -> None:
        local, other, remote, many = _EMBEDS[(self._table, name)]
        keys = [str(row[local]) for row in rows if row.get(local) is not None]
        found: dict[str, list[dict]] = {}
        if keys:
            sql = f"select * from {other} where {remote}::text = any(%s)"
            for record in conn.execute(sql, (keys,)).fetchall():
                item = _row(record)
                found.setdefault(str(item[remote]), []).append(item)
        for row in rows:
            key = str(row.get(local)) if row.get(local) is not None else ""
            matches = found.get(key, [])
            row[name] = matches if many else (matches[0] if matches else None)

    def _insert(self) -> list[dict]:
        payload = self._payload
        rows = payload if isinstance(payload, list) else [payload]
        if not rows:
            return []
        columns: list[str] = []
        for row in rows:
            for column in row:
                name = _ident(column)
                if name not in columns:
                    columns.append(name)
        placeholders = ", ".join(["%s"] * len(columns))
        sql = (
            f"insert into {self._table} ({', '.join(columns)}) "
            f"values ({placeholders}) returning *"
        )
        saved: list[dict] = []
        with self._connect() as conn:
            for row in rows:
                values = [row.get(column) for column in columns]
                saved.append(_row(conn.execute(sql, values).fetchone()))
        return saved

    def _update(self) -> list[dict]:
        payload = self._payload if isinstance(self._payload, dict) else {}
        assignments = []
        params: list[Any] = []
        for column, value in payload.items():
            assignments.append(f"{_ident(column)} = %s")
            params.append(value)
        where, where_params = self._where()
        sql = f"update {self._table} set {', '.join(assignments)}{where} returning *"
        with self._connect() as conn:
            return [_row(record) for record in conn.execute(sql, params + where_params).fetchall()]

    def _call_rpc(self) -> bool:
        name, params = self._rpc or ("", {})
        if name != "register_network_observation":
            raise ValueError(f"Unknown function {name}")
        sql = "select register_network_observation(%s, %s, %s::uuid, %s::uuid) as matched"
        values = (
            params["p_fingerprint"],
            params["p_provider"],
            params["p_merchant_id"],
            params["p_analysis_id"],
        )
        with self._connect() as conn:
            return bool(conn.execute(sql, values).fetchone()["matched"])


class LocalClient:
    def __init__(self, url: str) -> None:
        self._url = url

    def table(self, name: str) -> Query:
        return Query(self._url, name)

    def rpc(self, name: str, params: dict) -> Query:
        query = Query(self._url, "merchants")
        query._rpc = (name, params)
        return query
