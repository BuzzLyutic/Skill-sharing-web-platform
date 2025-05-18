package repositories

import (
	"context"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/google/uuid"
)

// UserRepositoryInterface defines methods for user data access
type UserRepositoryInterface interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
    GetByIDWithPassword(ctx context.Context, id uuid.UUID) (*models.User, error) 
    UpdatePassword(ctx context.Context, userID uuid.UUID, newPasswordHash string) error 
    Update(ctx context.Context, id uuid.UUID, req models.UserRequest) (*models.User, error) 
	GetAll(ctx context.Context) ([]models.User, error)
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateUserRole(ctx context.Context, userID uuid.UUID, newRole models.Role) error
}
