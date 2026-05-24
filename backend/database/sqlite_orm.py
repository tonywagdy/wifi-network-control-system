import datetime
import os
import sqlite3

class FieldDescriptor:
    def __init__(self, key):
        self.key = key
    def __eq__(self, other):
        return (self.key, '==', other)
    def __ne__(self, other):
        return (self.key, '!=', other)
    def desc(self):
        return (self.key, 'desc')

class Query:
    def __init__(self, session, model):
        self.session = session
        self.model = model
        self.conditions = []
        self._order_by = None
        self._limit = None

    def filter(self, *args):
        for arg in args:
            if isinstance(arg, tuple):
                self.conditions.append(arg)
        return self

    def order_by(self, arg):
        self._order_by = arg
        return self

    def limit(self, val):
        self._limit = val
        return self

    def all(self):
        return self.session.execute_query(self)

    def first(self):
        results = self.session.execute_query(self)
        return results[0] if results else None

    def update(self, values_dict):
        payload = {}
        for k, v in values_dict.items():
            key_str = k.key if hasattr(k, 'key') else str(k)
            payload[key_str] = v
        self.session.execute_update(self, payload)

def serialize_val(val):
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.isoformat()
    if isinstance(val, bool):
        return 1 if val else 0
    return val

def deserialize_val(col_name, val):
    if val is None:
        return None
    if col_name in ['first_seen', 'last_seen', 'timestamp', 'added_at']:
        try:
            val_str = str(val)
            if 'T' in val_str:
                return datetime.datetime.fromisoformat(val_str)
            else:
                return datetime.datetime.strptime(val_str, "%Y-%m-%d %H:%M:%S.%f")
        except Exception:
            try:
                return datetime.datetime.strptime(str(val), "%Y-%m-%d %H:%M:%S")
            except Exception:
                return datetime.datetime.utcnow()
    return val

# Global registry populated by models.py
TABLE_MAP = {}

class SQLiteSession:
    def __init__(self, db_path):
        self.db_path = db_path
        self._to_add = []
        self._to_delete = []

    def query(self, model):
        return Query(self, model)

    def add(self, instance):
        self._to_add.append(instance)

    def delete(self, instance):
        self._to_delete.append(instance)

    def rollback(self):
        self._to_add.clear()
        self._to_delete.clear()

    def refresh(self, instance):
        model_class = instance.__class__
        table_name = TABLE_MAP.get(model_class)
        pk_col = 'mac' if model_class.__name__ == 'DBDevice' else 'id'
        pk_val = getattr(instance, pk_col)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cols = [attr for attr in dir(model_class) if isinstance(getattr(model_class, attr), FieldDescriptor)]
        cursor.execute(f"SELECT {', '.join(cols)} FROM {table_name} WHERE {pk_col} = ?", (pk_val,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            for i, col in enumerate(cols):
                val = deserialize_val(col, row[i])
                setattr(instance, col, val)

    def close(self):
        pass

    def commit(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Handle deletes
            for instance in self._to_delete:
                model_class = instance.__class__
                table_name = TABLE_MAP.get(model_class)
                pk_col = 'mac' if model_class.__name__ == 'DBDevice' else 'id'
                pk_val = getattr(instance, pk_col)
                cursor.execute(f"DELETE FROM {table_name} WHERE {pk_col} = ?", (pk_val,))
            
            # Handle adds (inserts or updates)
            for instance in self._to_add:
                model_class = instance.__class__
                table_name = TABLE_MAP.get(model_class)
                pk_col = 'mac' if model_class.__name__ == 'DBDevice' else 'id'
                pk_val = getattr(instance, pk_col, None)
                
                cols = [attr for attr in dir(model_class) if isinstance(getattr(model_class, attr), FieldDescriptor)]
                # Check if it already exists in the table
                exists = False
                if pk_val is not None and pk_val != "":
                    cursor.execute(f"SELECT 1 FROM {table_name} WHERE {pk_col} = ?", (pk_val,))
                    if cursor.fetchone():
                        exists = True
                
                if exists:
                    update_cols = [c for c in cols if c != pk_col or model_class.__name__ == 'DBDevice']
                    set_clause = ", ".join([f"{c} = ?" for c in update_cols])
                    vals = [serialize_val(getattr(instance, c)) for c in update_cols]
                    vals.append(pk_val)
                    cursor.execute(f"UPDATE {table_name} SET {set_clause} WHERE {pk_col} = ?", tuple(vals))
                else:
                    vals = [serialize_val(getattr(instance, c)) for c in cols]
                    placeholders = ", ".join(["?"] * len(cols))
                    cursor.execute(f"INSERT OR REPLACE INTO {table_name} ({', '.join(cols)}) VALUES ({placeholders})", tuple(vals))
                    if pk_val is None or pk_val == "":
                        last_id = cursor.lastrowid
                        if last_id:
                            setattr(instance, pk_col, last_id)
            
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
            self._to_add.clear()
            self._to_delete.clear()

    def execute_query(self, query):
        model_class = query.model
        table_name = TABLE_MAP.get(model_class)
        cols = [attr for attr in dir(model_class) if isinstance(getattr(model_class, attr), FieldDescriptor)]
        
        sql = f"SELECT {', '.join(cols)} FROM {table_name}"
        params = []
        
        if query.conditions:
            conds_sql = []
            for col, op, val in query.conditions:
                if op == '==':
                    conds_sql.append(f"{col} = ?")
                    params.append(serialize_val(val))
                elif op == '!=':
                    conds_sql.append(f"{col} != ?")
                    params.append(serialize_val(val))
            sql += " WHERE " + " AND ".join(conds_sql)
            
        if query._order_by:
            if isinstance(query._order_by, tuple):
                key, direction = query._order_by
                sql += f" ORDER BY {key} {direction.upper()}"
            else:
                key = query._order_by.key if hasattr(query._order_by, 'key') else str(query._order_by)
                sql += f" ORDER BY {key} ASC"
                
        if query._limit:
            sql += f" LIMIT {query._limit}"
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()
        conn.close()
        
        instances = []
        for row in rows:
            kwargs = {}
            for i, col in enumerate(cols):
                kwargs[col] = deserialize_val(col, row[i])
            instance = model_class(**kwargs)
            pk_col = 'mac' if model_class.__name__ == 'DBDevice' else 'id'
            if hasattr(instance, pk_col):
                if kwargs.get(pk_col) is not None:
                    setattr(instance, pk_col, kwargs.get(pk_col))
            instances.append(instance)
            
        return instances

    def execute_update(self, query, values_dict):
        model_class = query.model
        table_name = TABLE_MAP.get(model_class)
        
        set_clause = ", ".join([f"{k} = ?" for k in values_dict.keys()])
        params = [serialize_val(v) for v in values_dict.values()]
        
        sql = f"UPDATE {table_name} SET {set_clause}"
        
        if query.conditions:
            conds_sql = []
            for col, op, val in query.conditions:
                if op == '==':
                    conds_sql.append(f"{col} = ?")
                    params.append(serialize_val(val))
                elif op == '!=':
                    conds_sql.append(f"{col} != ?")
                    params.append(serialize_val(val))
            sql += " WHERE " + " AND ".join(conds_sql)
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute(sql, tuple(params))
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
