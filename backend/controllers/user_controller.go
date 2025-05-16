package controllers

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/middleware"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
        "golang.org/x/crypto/bcrypt"
        
)

// UserController handles user-related HTTP requests
type UserController struct {
        repo *repositories.UserRepository
}

// NewUserController creates a new user controller
func NewUserController(repo *repositories.UserRepository) *UserController {
        return &UserController{repo: repo}
}


// --- Вспомогательные функции (вынести в общий пакет?) ---
func getUserRoleFromContext(ctx *gin.Context) (models.Role, bool) {
        // ... (реализация из предыдущего ответа) ...
        roleValue, exists := ctx.Get(middleware.ContextRoleKey)
        if !exists {
        log.Println("getUserRoleFromContext: Role not found in context")
        return "", false
        }   
        roleStr, ok := roleValue.(string)
        if !ok {
        log.Println("getUserRoleFromContext: Role in context is not a string")
        return "", false
        }
        role := models.Role(roleStr)
        if !models.IsValidRole(role) {
        log.Printf("getUserRoleFromContext: Invalid role in context: %s", roleStr)
        return "", false
        }
        if !models.IsValidRole(role){ return "", false }
        return role, true
}


// GetAll handles GET /api/admin/users (только для админа)
func (c *UserController) GetAll(ctx *gin.Context) {
        // Авторизация уже проверена middleware RoleAuthMiddleware(models.RoleAdmin)
            // Передаем контекст!
            users, err := c.repo.GetAll(ctx.Request.Context())
            if err != nil {
            // Ошибка уже залогирована в репозитории
                    ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
                    return
            }
        // users уже гарантированно не nil и не содержит паролей/токенов из-за repo и модели
            ctx.JSON(http.StatusOK, users)
}

// GetByID handles GET /api/admin/users/:id (только для админа)
func (c *UserController) GetByID(ctx *gin.Context) {
        // Авторизация уже проверена middleware RoleAuthMiddleware(models.RoleAdmin)
        idStr := ctx.Param("id")
        targetUserID, err := uuid.Parse(idStr)
        if err != nil {
                ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
                return
        }
    
        // Передаем контекст!
        user, err := c.repo.GetByID(ctx.Request.Context(), targetUserID)
        if err != nil {
                if errors.Is(err, repositories.ErrUserNotFound) {
                        ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
                } else {
                log.Printf("GetByID (Admin): Error fetching user %s: %v", targetUserID, err)
                        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
                }
                return
        }
    
        // user (указатель) может быть nil, если GetByID его вернул, но мы проверили err
        if user == nil { // Дополнительная проверка
            ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        // Модель User скрывает пароль/токен через json:"-"
            ctx.JSON(http.StatusOK, user)
    }

// Update handles PUT /api/users/:id (для админа или самого пользователя)
// Важно: Этот маршрут в routes.go не должен быть под /api/admin, если он для всех
// Если оставить его в /api/admin/users/:id, то он будет только для админа.
// Давайте предположим, что он должен быть доступен и пользователю для себя (например, /api/users/me или /api/users/:id с проверкой)
func (c *UserController) Update(ctx *gin.Context) {
	targetUserIDStr := ctx.Param("id")
	targetUserID, err := uuid.Parse(targetUserIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target user ID format"})
		return
	}

	currentUserID, ok := getUserIDFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}
	currentUserRole, ok := getUserRoleFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error: User role processing failed"})
		return
	}

	// --- Авторизация ---
	isAdmin := currentUserRole == models.RoleAdmin
	isSelf := targetUserID == currentUserID

	if !isSelf && !isAdmin {
        log.Printf("Forbidden: User %s (role %s) attempted to update user %s", currentUserID, currentUserRole, targetUserID)
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You can only update your own profile or you need admin rights."})
		return
	}

	var req models.UserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
        log.Printf("UpdateUser: Failed to bind JSON for target user %s by user %s: %v", targetUserID, currentUserID, err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Передаем контекст!
	updatedUser, err := c.repo.Update(ctx.Request.Context(), targetUserID, req)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        } else { // Предполагаем, что другие ошибки уже обернуты как ErrDatabase
            log.Printf("UpdateUser: Error updating user %s: %v", targetUserID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		}
		return
	}

	if updatedUser == nil { // Доп. проверка после исправления repo на *models.User
		ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found after update attempt"})
        return
	}
	ctx.JSON(http.StatusOK, updatedUser) // Модель User скрывает пароль/токен
}

// Delete handles DELETE /api/admin/users/:id (только для админа)
// Или /api/users/:id с проверкой роли
func (c *UserController) Delete(ctx *gin.Context) {
	targetUserIDStr := ctx.Param("id")
	targetUserID, err := uuid.Parse(targetUserIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	currentUserID, ok := getUserIDFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}
	currentUserRole, ok := getUserRoleFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error: User role processing failed"})
		return
	}

	// --- Авторизация ---
	// Позволим админу и модератору удалять, но не себя
    canDelete := currentUserRole == models.RoleAdmin || currentUserRole == models.RoleModerator
	isSelf := targetUserID == currentUserID

	if isSelf {
        ctx.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You cannot delete your own account via this endpoint."})
        return
    }
	if !canDelete {
        log.Printf("Forbidden: User %s (role %s) attempted to delete user %s", currentUserID, currentUserRole, targetUserID)
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to delete users."})
		return
	}

	// Передаем контекст!
	err = c.repo.Delete(ctx.Request.Context(), targetUserID)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
            log.Printf("DeleteUser: Error deleting user %s by %s: %v", targetUserID, currentUserID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		}
		return
	}

	log.Printf("User %s deleted user %s successfully", currentUserID, targetUserID)
	ctx.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}


// UpdateUserRole обрабатывает PUT /api/admin/users/:id/role (только для админа)
func (c *UserController) UpdateUserRole(ctx *gin.Context) {
        // Авторизация уже проверена middleware RoleAuthMiddleware(models.RoleAdmin)
            targetUserIDStr := ctx.Param("id")
            targetUserID, err := uuid.Parse(targetUserIDStr)
            if err != nil {
                    ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target user ID format"})
                    return
            }
    
            adminUserID, _ := getUserIDFromContext(ctx) // Админ точно есть, раз прошел middleware
    
            if targetUserID == adminUserID {
                    ctx.JSON(http.StatusForbidden, gin.H{"error": "Admin cannot change their own role via this endpoint"})
                    return
            }
    
            var req models.UserRoleUpdateRequest
            if err := ctx.ShouldBindJSON(&req); err != nil {
                    log.Printf("UpdateUserRole: Failed to bind JSON for target user %s by admin %s: %v", targetUserID, adminUserID, err)
                    ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
                    return
            }
    
        // Валидация роли binding:"oneof=..." уже отработала
        // Доп. проверка через IsValidRole не обязательна, но не повредит
    
            err = c.repo.UpdateUserRole(ctx.Request.Context(), targetUserID, req.Role) // Передаем контекст!
            if err != nil {
                    if errors.Is(err, repositories.ErrUserNotFound) {
                            ctx.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Target user with ID %s not found", targetUserID)})
            } else if errors.Is(err, repositories.ErrDatabase) {
                log.Printf("UpdateUserRole: DB error for target %s by admin %s: %v", targetUserID, adminUserID, err)
                            ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
            } else {
                 log.Printf("UpdateUserRole: Unexpected error for target %s by admin %s: %v", targetUserID, adminUserID, err)
                 ctx.JSON(http.StatusInternalServerError, gin.H{"error": "An unexpected error occurred"})
            }
                    return
            }
    
            log.Printf("Admin %s successfully updated role of user %s to '%s'", adminUserID, targetUserID, req.Role)
            ctx.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("User %s role updated to %s successfully", targetUserID, req.Role)})
}


// UpdateMe handles PUT /api/users/me (for the authenticated user to update their own profile)
func (c *UserController) UpdateMe(ctx *gin.Context) {
    currentUserID, ok := getUserIDFromContext(ctx)
    if !ok {
        ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
        return
    }

    var req models.UserRequest // Reusing UserRequest, ensure frontend sends only name, bio, skills
    if err := ctx.ShouldBindJSON(&req); err != nil {
        log.Printf("UpdateMe: Failed to bind JSON for user %s: %v", currentUserID, err)
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
        return
    }

    // The repository's Update method is designed to only update specific fields (name, bio, skills)
    // So, even if other fields were in UserRequest, they wouldn't be updated by this call.
    updatedUser, err := c.repo.Update(ctx.Request.Context(), currentUserID, req)
    if err != nil {
        if errors.Is(err, repositories.ErrUserNotFound) {
            ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        } else {
            log.Printf("UpdateMe: Error updating user %s: %v", currentUserID, err)
            ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
        }
        return
    }

    if updatedUser == nil {
        ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found after update attempt"})
        return
    }
    ctx.JSON(http.StatusOK, updatedUser)
}


// ChangePassword handles PUT /api/users/me/password
func (c *UserController) ChangePassword(ctx *gin.Context) {
    currentUserID, ok := getUserIDFromContext(ctx) // Make sure this helper is available and correct
    if !ok {
        ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
        return
    }

    var req models.PasswordChangeRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        log.Printf("ChangePassword: Failed to bind JSON for user %s: %v", currentUserID, err)
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
        return
    }

    // 1. Fetch the user with their current password hash
    //    It's important to fetch fresh data to avoid stale reads.
    user, err := c.repo.GetByIDWithPassword(ctx.Request.Context(), currentUserID)
    if err != nil {
        if errors.Is(err, repositories.ErrUserNotFound) {
            ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        } else {
            log.Printf("ChangePassword: Error fetching user %s: %v", currentUserID, err)
            ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
        }
        return
    }

    if user.PasswordHash == nil || *user.PasswordHash == "" {
        // This case might happen for users who signed up via OAuth and never set a password
        log.Printf("ChangePassword: User %s has no password set (possibly OAuth user).", currentUserID)
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Password not set for this account. Cannot change."})
        return
    }

    // 2. Verify current password
    err = bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.CurrentPassword))
    if err != nil {
        log.Printf("ChangePassword: Invalid current password for user %s", currentUserID)
        ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid current password"})
        return
    }

    // 3. Hash the new password
    newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
    if err != nil {
        log.Printf("ChangePassword: Error hashing new password for user %s: %v", currentUserID, err)
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process new password"})
        return
    }

    // 4. Update the password in the repository
    err = c.repo.UpdatePassword(ctx.Request.Context(), currentUserID, string(newPasswordHash))
    if err != nil {
        // Error already logged in repository
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
        return
    }

    log.Printf("User %s successfully changed their password.", currentUserID)
    ctx.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}