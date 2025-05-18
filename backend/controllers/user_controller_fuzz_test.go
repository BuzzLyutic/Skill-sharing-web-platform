package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/middleware"  
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"       
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories" 

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var _ repositories.UserRepositoryInterface = (*mockUserRepository)(nil)

// --- Mock UserRepository ---
type mockUserRepository struct {
    users          map[uuid.UUID]models.User
    GetByIDFunc        func(ctx context.Context, id uuid.UUID) (*models.User, error)
    UpdateFunc         func(ctx context.Context, id uuid.UUID, req models.UserRequest) (*models.User, error)
    UpdateRoleFunc     func(ctx context.Context, id uuid.UUID, role models.Role) error
    DeleteFunc         func(ctx context.Context, id uuid.UUID) error
    GetAllFunc         func(ctx context.Context) ([]models.User, error)
    GetByEmailFunc     func(ctx context.Context, email string) (*models.User, error)
    CreateUserFunc     func(ctx context.Context, req models.RegisterRequest, passwordHash string) (*models.User, error)
    SaveRefreshTokenFunc func(ctx context.Context, userID uuid.UUID, refreshToken *string) error
	GetByIDWithPasswordFunc func(ctx context.Context, id uuid.UUID) (*models.User, error)
    UpdatePasswordFunc func(ctx context.Context, userID uuid.UUID, newPasswordHash string) error
}

func newMockUserRepository() *mockUserRepository {
	return &mockUserRepository{
		users: make(map[uuid.UUID]models.User),
	}
}

func (m *mockUserRepository) GetAll(ctx context.Context) ([]models.User, error) {
	panic("GetAll not implemented for this fuzz test mock")
}

func (m *mockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	user, exists := m.users[id]
	if !exists {
		return nil, repositories.ErrUserNotFound
	}
	return &user, nil
}

func (m *mockUserRepository) Update(ctx context.Context, id uuid.UUID, req models.UserRequest) (*models.User, error) {
    if m.UpdateFunc != nil {
        return m.UpdateFunc(ctx, id, req)
    }
    user, exists := m.users[id]
    if !exists {
        return nil, repositories.ErrUserNotFound
    }
    if req.Name != "" {
        user.Name = req.Name
    }
    if req.Bio != "" { 
        user.Bio = &req.Bio 
    } else { 
        user.Bio = nil
    }
    if req.Skills != nil { 
        user.Skills = req.Skills 
    } else {
        user.Skills = []string{} 
    }
    user.UpdatedAt = time.Now() 
    m.users[id] = user
    userCopy := user
    return &userCopy, nil
}

func (m *mockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	panic("Delete not implemented for this fuzz test mock")
}

func (m *mockUserRepository) UpdateUserRole(ctx context.Context, id uuid.UUID, role models.Role) error {
	if m.UpdateRoleFunc != nil {
		return m.UpdateRoleFunc(ctx, id, role)
	}
	user, exists := m.users[id]
	if !exists {
		return repositories.ErrUserNotFound
	}
	if !models.IsValidRole(role) { 
		return fmt.Errorf("invalid role: %s", role)
	}
	user.Role = string(role)
	m.users[id] = user
	return nil
}

func (m *mockUserRepository) GetByIDWithPassword(ctx context.Context, id uuid.UUID) (*models.User, error) {
	if m.GetByIDWithPasswordFunc != nil {
		return m.GetByIDWithPasswordFunc(ctx, id)
	}
	
	user, exists := m.users[id]
	if !exists {
		return nil, repositories.ErrUserNotFound
	}
   
	userCopy := user 
	return &userCopy, nil
}

func (m *mockUserRepository) UpdatePassword(ctx context.Context, userID uuid.UUID, newPasswordHash string) error {
    if m.UpdatePasswordFunc != nil {
        return m.UpdatePasswordFunc(ctx, userID, newPasswordHash)
    }
    user, exists := m.users[userID]
    if !exists {
        return repositories.ErrUserNotFound
    }
    user.PasswordHash = &newPasswordHash 
    user.UpdatedAt = time.Now()
    m.users[userID] = user
    return nil
}


func FuzzUserControllerGetByID(f *testing.F) {
	f.Add("123e4567-e89b-12d3-a456-426614174000") // Valid UUID
	f.Add("not-a-valid-uuid")
	f.Add("")  // Empty string
	f.Add("abcdef") // Short string
	f.Add(strings.Repeat("a", 100)) // Long string
	existingUUID := uuid.New()
	f.Add(existingUUID.String())


	f.Fuzz(func(t *testing.T, idStr string) {
		gin.SetMode(gin.TestMode) 

		mockRepo := newMockUserRepository()
		if idStr == existingUUID.String() {
			mockRepo.users[existingUUID] = models.User{ID: existingUUID, Name: "testuser", Email: "test@example.com", Role: string(models.RoleUser)}
		}
		
		userController := NewUserController(mockRepo)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		
		c.Params = gin.Params{
			gin.Param{Key: "id", Value: idStr},
		}
		c.Request, _ = http.NewRequest("GET", "/api/admin/users/"+idStr, nil)

		userController.GetByID(c)
	})
}


func FuzzUserControllerUpdate(f *testing.F) {
	adminID := uuid.New()
	userID := uuid.New()

	validUserReq := models.UserRequest{Name: "newname", Email: "new@example.com"}
	validUserReqJSON, _ := json.Marshal(validUserReq)
	f.Add(userID.String(), string(validUserReqJSON), userID.String(), string(models.RoleUser))   
	f.Add(userID.String(), string(validUserReqJSON), adminID.String(), string(models.RoleAdmin))  
	
	invalidJSON := `{"name": "test", "email": "invalid"}` 
	f.Add(userID.String(), invalidJSON, userID.String(), string(models.RoleUser))

	f.Add("not-a-uuid", string(validUserReqJSON), userID.String(), string(models.RoleUser)) 
	f.Add(userID.String(), `{"bad json`, userID.String(), string(models.RoleUser))         
	f.Add(userID.String(), `{}`, userID.String(), string(models.RoleUser))                  
	f.Add(userID.String(), `{"unknown_field": 123}`, userID.String(), string(models.RoleUser)) 

	f.Fuzz(func(t *testing.T, targetIDStr, jsonBody, currentUserIDStr, currentUserRoleStr string) {
		gin.SetMode(gin.TestMode)

		mockRepo := newMockUserRepository()
		userController := NewUserController(mockRepo)

		currentUserIDCtx, errParseCurrentID := uuid.Parse(currentUserIDStr)
		
		mockRepo.users[userID] = models.User{ID: userID, Name: "original", Email: "original@example.com", Role: string(models.RoleUser)}
		mockRepo.users[adminID] = models.User{ID: adminID, Name: "admin", Email: "admin@example.com", Role: string(models.RoleAdmin)}

    	if parsedTargetID, err := uuid.Parse(targetIDStr); err == nil {
        	if _, exists := mockRepo.users[parsedTargetID]; !exists { 
             	mockRepo.users[parsedTargetID] = models.User{ID: parsedTargetID, Name: "target", Email: "target@example.com", Role: string(models.RoleUser)}
        	}
    	}

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		var err error 
		c.Request, err = http.NewRequest("PUT", "/api/users/"+targetIDStr, bytes.NewBufferString(jsonBody))
		if err != nil {
			// Если запрос не может быть создан (например, неверный URL-адрес из-за TargetID Str),
			// то эта итерация фаззера не может выполняться осмысленно для этого обработчика.
			// Мы можем зарегистрировать его и пропустить или просто пропустить.
			t.Logf("Skipping fuzz iteration, failed to create HTTP request: %v (targetIDStr: %q)", err, targetIDStr)
			return 
		}

		c.Request, _ = http.NewRequest("PUT", "/api/users/"+targetIDStr, bytes.NewBufferString(jsonBody))
		c.Request.Header.Set("Content-Type", "application/json")

		c.Params = gin.Params{gin.Param{Key: "id", Value: targetIDStr}}
		if errParseCurrentID == nil { 
			c.Set(middleware.ContextUserIDKey, currentUserIDCtx)
		}
		c.Set(middleware.ContextRoleKey, currentUserRoleStr) 

		userController.Update(c)

	})
}

