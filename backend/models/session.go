package models

import (
	"time"

	"github.com/google/uuid"
)

// Session represents a skill-sharing session
type Session struct {
	ID              uuid.UUID `json:"id" db:"id"`
	Title           string    `json:"title" db:"title"`
	Description     string    `json:"description" db:"description"`
	Category        string    `json:"category" db:"category"`
	DateTime        time.Time `json:"date_time" db:"date_time"`
	Location        string    `json:"location" db:"location"`
	MaxParticipants int       `json:"max_participants" db:"max_participants"`
	CreatorID       uuid.UUID `json:"creator_id" db:"creator_id"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// SessionRequest for creating/updating sessions
type SessionRequest struct {
	Title           string    `json:"title" binding:"required"`
	Description     string    `json:"description"`
	Category        string    `json:"category" binding:"required"`
	DateTime        time.Time `json:"date_time" binding:"required"`
	Location        string    `json:"location" binding:"required"`
	MaxParticipants int       `json:"max_participants" binding:"required,min=1"`
}


// SessionSearchFilters - структура для параметров поиска
type SessionSearchFilters struct {
    Query           string    // Поиск по title, description
    Category        string
    Skill           string    
    DateFrom        *time.Time 
    DateTo          *time.Time
    MinRating       float64   // Для фильтрации по среднему рейтингу сессии (потребует JOIN с feedback или денормализации)
    CreatorID       *uuid.UUID
    Location        string
    AvailableSlots  bool      // Только сессии, где есть свободные места
    ExcludePast     bool      // Исключать прошедшие сессии (по умолчанию true)
    // Пагинация
    Limit           int
    Offset          int
}