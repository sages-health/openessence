-- Trigger for notifying application layer about data changes
CREATE OR REPLACE FUNCTION oe.notify_trigger()
  RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'TRUNCATE'
  THEN
      PERFORM pg_notify(TG_TABLE_NAME || '_truncate');
    RETURN null;
  END IF;

  IF TG_LEVEL = 'STATEMENT'
  THEN
    RAISE EXCEPTION 'Cannot run % at statement level. Use ROW instead.', TG_OP;
  END IF;

  IF TG_WHEN <> 'AFTER'
  THEN
    RAISE EXCEPTION 'notify_trigger must be run AFTER operation';
  END IF;

  IF TG_OP = 'INSERT'
  THEN
-- This assumes the elasticsearch document _id is the 'id' field. This is a fair assumption since even in the case of
-- composite primary keys, you need some mapping to elasticsearch document _id. However, we may want to add some way to
-- change this column's name (or how it's computed) in the future.
      PERFORM pg_notify(TG_TABLE_NAME || '_insert', NEW.id :: TEXT);

  ELSIF TG_OP = 'UPDATE'
    THEN
        PERFORM pg_notify(TG_TABLE_NAME || '_update', '{ "new":' || NEW.id || ', "old":' || OLD.id || '}');

  ELSIF TG_OP = 'DELETE'
    THEN
        PERFORM pg_notify(TG_TABLE_NAME || '_delete', OLD.id :: TEXT);

  ELSE
-- This will probably never happen
    RAISE EXCEPTION 'Unknown TG_OP: %', TG_OP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to help in adding notify_trigger
CREATE OR REPLACE FUNCTION oe.add_notify_triggers(table_name TEXT)
  RETURNS VOID AS $$
BEGIN
  EXECUTE 'CREATE TRIGGER notify_changes' ||
          ' AFTER INSERT OR UPDATE OR DELETE ON ' || table_name ||
          ' FOR EACH ROW EXECUTE PROCEDURE notify_trigger()';

  EXECUTE 'CREATE TRIGGER notify_truncate' ||
          ' AFTER TRUNCATE ON ' || table_name ||
          ' FOR EACH STATEMENT EXECUTE PROCEDURE notify_trigger()';
END;
$$ LANGUAGE plpgsql;

-- Function to help in removing notify_trigger
CREATE OR REPLACE FUNCTION oe.drop_notify_triggers(table_name TEXT)
  RETURNS VOID AS $$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS notify_changes ON ' || table_name;
  EXECUTE 'DROP TRIGGER IF EXISTS notify_truncate ON ' || table_name;
END;
$$ LANGUAGE plpgsql;
