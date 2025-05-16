package models

import (
	"time"
	"github.com/lib/pq"
	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID            uuid.UUID `json:"id" db:"id"`
	Email         string    `json:"email" db:"email"`
	PasswordHash  *string    `json:"-" db:"password_hash"`
	OAuthProvider *string    `json:"oauth_provider,omitempty" db:"oauth_provider"`
	OAuthID       *string    `json:"oauth_id,omitempty" db:"oauth_id"`
	Name          string    `json:"name" db:"name"`
	Bio           *string    `json:"bio,omitempty" db:"bio"`
	Skills        pq.StringArray  `json:"skills" db:"skills"`
	AverageRating float64   `json:"average_rating" db:"average_rating"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
	Role         string    `db:"role" json:"role"` // Добавляем роль пользователя
	RefreshToken  *string    `db:"jwt_refresh_token" json:"-"`
}

// UserRequest for creating/updating users
type UserRequest struct {
	Email    string   `json:"email,omitempty" binding:"omitempty,email"`
	Password string   `json:"password,omitempty"`
	Name     string   `json:"name" binding:"required"`
	Bio      string   `json:"bio,omitempty"`
	Skills   []string `json:"skills"`
}


// Role type for clarity
type Role string

const (
    RoleUser      Role = "user"
    RoleModerator Role = "moderator"
    RoleAdmin     Role = "admin"
)

// Функция для проверки валидности роли
func IsValidRole(role Role) bool {
    switch role {
    case RoleUser, RoleModerator, RoleAdmin:
        return true
    default:
        return false
    }
}

type PasswordChangeRequest struct {
    CurrentPassword string `json:"current_password" binding:"required"`
    NewPassword     string `json:"new_password" binding:"required,min=8"`
    ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
}