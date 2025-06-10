-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update average_rating in Users table
CREATE OR REPLACE FUNCTION update_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the average rating for the session creator
    UPDATE users
    SET average_rating = (
        SELECT COALESCE(AVG(f.rating), 0)
        FROM feedback f
        JOIN sessions s ON f.session_id = s.id
        WHERE s.creator_id = users.id
    )
    WHERE id IN (
        SELECT creator_id
        FROM sessions
        WHERE id = NEW.session_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    skills VARCHAR(50)[] NOT NULL DEFAULT '{}',
    average_rating FLOAT DEFAULT 0.0,
    role VARCHAR(20) NOT NULL DEFAULT "user",
    jwt_refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Create GIN index on skills for efficient array searches
CREATE INDEX idx_users_skills ON users USING GIN(skills);

-- Trigger to update updated_at in Users
CREATE TRIGGER trigger_update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Table: Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    max_participants INTEGER NOT NULL CHECK (max_participants > 0),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on creator_id for faster joins
CREATE INDEX idx_sessions_creator_id ON sessions(creator_id);

-- Trigger to update updated_at in Sessions
CREATE TRIGGER trigger_update_sessions_timestamp
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Table: Session_Participants (many-to-many relationship)
CREATE TABLE session_participants (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (session_id, user_id)
);

-- Create index on user_id for faster joins
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);

-- Table: Feedback
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_id and user_id for faster joins
CREATE INDEX idx_feedback_session_id ON feedback(session_id);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);

-- Trigger to update average_rating in Users when feedback is added
CREATE TRIGGER trigger_update_average_rating
AFTER INSERT OR UPDATE ON feedback
FOR EACH ROW
EXECUTE FUNCTION update_average_rating();

-- Table: Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id UUID,
    related_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster joins
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
