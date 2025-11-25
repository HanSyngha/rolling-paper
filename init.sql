-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(255) PRIMARY KEY,
    author VARCHAR(255) NOT NULL,
    "group" VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    likes INTEGER DEFAULT 0,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_messages_group ON messages("group");
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to notify on message changes
CREATE OR REPLACE FUNCTION notify_message_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all listeners that messages have changed
    PERFORM pg_notify('messages_changed', json_build_object(
        'operation', TG_OP,
        'id', COALESCE(NEW.id, OLD.id)
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for INSERT, UPDATE, DELETE
CREATE TRIGGER messages_insert_notify
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_message_change();

CREATE TRIGGER messages_update_notify
    AFTER UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_message_change();

CREATE TRIGGER messages_delete_notify
    AFTER DELETE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_message_change();
