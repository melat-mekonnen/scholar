-- Add personalization fields to student_profiles
ALTER TABLE student_profiles
ADD COLUMN financial_need BOOLEAN DEFAULT FALSE,
ADD COLUMN preferred_funding_type VARCHAR(50),
ADD COLUMN language_proficiency TEXT[],
ADD COLUMN preferred_scholarship_type VARCHAR(100),
ADD COLUMN goals TEXT;

-- Create recommendation_feedback table for tracking user interactions
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scholarship_id UUID NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('viewed', 'clicked', 'saved', 'dismissed', 'applied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying feedback efficiently
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_scholarship_id ON recommendation_feedback(scholarship_id);
