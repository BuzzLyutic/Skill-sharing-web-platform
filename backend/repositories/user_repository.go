package repositories

import (
	"time"
        "fmt"
        "log"
        "errors"
        "context"
        "database/sql"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
        "github.com/lib/pq"
)

// Определим ошибки репозитория пользователей
var (
	ErrUserNotFound = errors.New("user not found")
)

// UserRepository handles database operations for users
type UserRepository struct {
	db *sqlx.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *sqlx.DB) *UserRepository {
        return &UserRepository{db: db}
}

// GetAll retrieves all users
func (r *UserRepository) GetAll(ctx context.Context) ([]models.User, error) {
        users := []models.User{}
        query := `
		SELECT id, email, oauth_provider, oauth_id, name, bio, skills, average_rating, created_at, updated_at, role
		FROM users ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &users, query) // Используем SelectContext
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Printf("ERROR getting all users: %v", err)
		return nil, fmt.Errorf("%w: failed to get all users: %v", ErrDatabase, err)
	}
	if users == nil {
		users = []models.User{} // Гарантируем [] вместо null
	}
	return users, nil
}

// GetByID retrieves a user by ID, возвращает указатель
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	// Выбираем все поля, так как этот метод может использоваться внутри системы
	// Безопасность возврата данных обеспечивается на уровне контроллера/модели (json:"-")
	query := `SELECT * FROM users WHERE id = $1`
	err := r.db.GetContext(ctx, &user, query, id) // Используем GetContext
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		log.Printf("ERROR getting user by ID %s: %v", id, err)
		return nil, fmt.Errorf("%w: failed to get user by id %s: %v", ErrDatabase, id, err)
	}
	return &user, nil
}

// Update обновляет профиль пользователя (вызывается самим пользователем или админом)
func (r *UserRepository) Update(ctx context.Context, id uuid.UUID, req models.UserRequest) (*models.User, error) {
	var updatedUser models.User
        // Явно указываем обновляемые и возвращаемые поля
	query := `
		UPDATE users
		SET name = $2, bio = $3, skills = $4, updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, oauth_provider, oauth_id, name, bio, skills, average_rating, created_at, updated_at, role
	`
        var bio sql.NullString
        if req.Bio != "" { bio = sql.NullString{String: req.Bio, Valid: true} }
        skills := pq.Array(req.Skills)
        if req.Skills == nil { skills = pq.Array([]string{}) }

	err := r.db.GetContext(ctx, &updatedUser, query, id, req.Name, bio, skills)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		log.Printf("ERROR updating user %s: %v", id, err)
		return nil, fmt.Errorf("%w: failed to update user %s: %v", ErrDatabase, id, err)
	}
	return &updatedUser, nil
}

// Delete удаляет пользователя
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		log.Printf("ERROR deleting user %s: %v", id, err)
		return fmt.Errorf("%w: failed to delete user %s: %v", ErrDatabase, id, err)
	}
	rowsAffected, _ := result.RowsAffected() // Ошибку получения affected rows можно игнорировать
	if rowsAffected == 0 {
		return ErrUserNotFound
	}
	return nil
}

// GetByEmail находит пользователя по email, возвращает указатель
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	// Нужны все поля для Login/Register
	query := `SELECT * FROM users WHERE email = $1`
	err := r.db.GetContext(ctx, &user, query, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		log.Printf("ERROR getting user by email %s: %v", email, err)
		return nil, fmt.Errorf("%w: failed to get user by email %s: %v", ErrDatabase, email, err)
	}
	return &user, nil
}

// CreateUser создает нового пользователя, возвращает указатель
func (r *UserRepository) CreateUser(ctx context.Context, req models.RegisterRequest, passwordHash string) (*models.User, error) {
        var user models.User
        // Явно указываем поля и используем RETURNING для получения безопасных полей
	query := `
        INSERT INTO users (email, password_hash, name, bio, skills, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, email, oauth_provider, oauth_id, name, bio, skills, average_rating, created_at, updated_at, role
    `
	role := models.Role(req.Role) // Преобразуем строку в models.Role
	if role == "" || !models.IsValidRole(role) {
		role = models.RoleUser // Устанавливаем роль по умолчанию
	}

        var bio sql.NullString
        if req.Bio != "" { bio = sql.NullString{String: req.Bio, Valid: true} }
        skills := pq.Array(req.Skills)
        if req.Skills == nil { skills = pq.Array([]string{}) }

	err := r.db.GetContext(ctx, &user, query,
		req.Email, passwordHash, req.Name, bio, skills, role)

	if err != nil {
        var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" { // unique_violation (вероятно email)
            log.Printf("INFO: Attempted registration with existing email: %s", req.Email)
			return nil, fmt.Errorf("user with email '%s' already exists", req.Email) // Возвращаем ошибку уровня сервиса/контроллера
		}
		log.Printf("ERROR creating user with email %s: %v", req.Email, err)
		return nil, fmt.Errorf("%w: failed to create user: %v", ErrDatabase, err)
	}
	return &user, nil
}

func (r *UserRepository) UpdateRefreshToken(userID uuid.UUID, refreshToken string) error {
        query := `UPDATE users SET jwt_refresh_token = $1, updated_at = $2 WHERE id = $3`
        _, err := r.db.Exec(query, refreshToken, time.Now(), userID)
        return err
    }

// SaveRefreshToken сохраняет refresh token
func (r *UserRepository) SaveRefreshToken(ctx context.Context, userID uuid.UUID, refreshToken *string) error {
        query := `UPDATE users SET jwt_refresh_token = $1, updated_at = NOW() WHERE id = $2`
	result, err := r.db.ExecContext(ctx, query, refreshToken, userID)
	if err != nil {
        log.Printf("ERROR saving refresh token for user %s: %v", userID, err)
		return fmt.Errorf("%w: failed to save refresh token for user %s: %v", ErrDatabase, userID, err)
	}
        rowsAffected, _ := result.RowsAffected()
        if rowsAffected == 0 {
                return ErrUserNotFound // Не смогли обновить токен для несуществующего юзера
        }
	return nil
}
    
// GetUserByRefreshToken находит пользователя по refresh token, возвращает указатель
func (r *UserRepository) GetUserByRefreshToken(ctx context.Context, refreshToken string) (*models.User, error) {
        var user models.User
        // Нужны все поля для генерации токенов
        query := `SELECT * FROM users WHERE jwt_refresh_token = $1`
        err := r.db.GetContext(ctx, &user, query, refreshToken)
        if err != nil {
            if errors.Is(err, sql.ErrNoRows) {
                return nil, ErrUserNotFound // Или специфичная ошибка ErrInvalidRefreshToken
            }
            log.Printf("ERROR getting user by refresh token: %v", err)
            return nil, fmt.Errorf("%w: failed to get user by refresh token: %v", ErrDatabase, err)
        }
        return &user, nil
    }
    
// InvalidateRefreshToken устанавливает refresh token в NULL
func (r *UserRepository) InvalidateRefreshToken(ctx context.Context, userID uuid.UUID) error {
	return r.SaveRefreshToken(ctx, userID, nil) // Просто вызываем Save с nil
}
    
// CreateOAuthUser ... (добавить context, GetContext, обработку ошибок, *models.User)
func (r *UserRepository) CreateOAuthUser(ctx context.Context, user models.User) (*models.User, error) {
        query := `
            INSERT INTO users (id, email, password_hash, oauth_provider, oauth_id, name, bio, skills, role, average_rating, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, email, oauth_provider, oauth_id, name, bio, skills, average_rating, created_at, updated_at, role
        `
        var createdUser models.User
        if user.Role == "" { user.Role = string(models.RoleUser) }
        if user.ID == uuid.Nil { user.ID = uuid.New() }
        now := time.Now()
        if user.CreatedAt.IsZero() { user.CreatedAt = now }
        if user.UpdatedAt.IsZero() { user.UpdatedAt = now }
        var bio sql.NullString
        if user.Bio != nil { bio = sql.NullString{String: *user.Bio, Valid: true} }
        skills := pq.Array(user.Skills)
        if user.Skills == nil { skills = pq.Array([]string{}) }
    
    
        err := r.db.GetContext(ctx, &createdUser, query,
            user.ID, user.Email, nil, user.OAuthProvider, user.OAuthID,
            user.Name, bio, skills, user.Role, user.AverageRating,
            user.CreatedAt, user.UpdatedAt,
        )
        if err != nil {
            // Проверка на дубликат email
            var pqErr *pq.Error
                    if errors.As(err, &pqErr) && pqErr.Code == "23505" {
                 log.Printf("INFO: Attempted OAuth registration with existing email: %s", user.Email)
                             return nil, fmt.Errorf("user with email '%s' already exists", user.Email)
            }
            log.Printf("CreateOAuthUser error: %v", err)
            return nil, fmt.Errorf("%w: failed to create oauth user: %v", ErrDatabase, err)
        }
        return &createdUser, nil
}

// GetByOAuth ... (добавить context, GetContext, обработку ошибок, *models.User)
func (r *UserRepository) GetByOAuth(ctx context.Context, provider, oauthID string) (*models.User, error) {
        var user models.User
        query := `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2`
        err := r.db.GetContext(ctx, &user, query, provider, oauthID)
        if err != nil {
            if errors.Is(err, sql.ErrNoRows) {
                return nil, ErrUserNotFound
            }
            log.Printf("ERROR getting user by OAuth %s/%s: %v", provider, oauthID, err)
            return nil, fmt.Errorf("%w: failed to get user by oauth: %v", ErrDatabase, err)
        }
        return &user, nil
    }

 // LinkOAuthToUser ... (добавить context, ExecContext, обработку ошибок)
func (r *UserRepository) LinkOAuthToUser(ctx context.Context, userID uuid.UUID, provider, oauthID string) error {
        query := `
            UPDATE users
            SET oauth_provider = $1, oauth_id = $2, updated_at = $3
            WHERE id = $4 AND oauth_provider IS NULL AND oauth_id IS NULL
        `
        result, err := r.db.ExecContext(ctx, query, provider, oauthID, time.Now(), userID)
        if err != nil {
            log.Printf("Error linking OAuth for user %s: %v", userID, err)
            return fmt.Errorf("%w: failed to link oauth: %v", ErrDatabase, err)
        }
        rowsAffected, _ := result.RowsAffected()
        if rowsAffected == 0 {
            log.Printf("OAuth link skipped or failed for user %s, provider %s: 0 rows affected (maybe already linked?)", userID, provider)
            // Можно вернуть ошибку, если 0 строк - это проблема
            // return errors.New("account already linked or user not found")
        }
        return nil
}

// UpdateUserRole обновляет только роль пользователя
func (r *UserRepository) UpdateUserRole(ctx context.Context, userID uuid.UUID, newRole models.Role) error {
	// Проверка валидности роли на всякий случай (хотя должна быть и в контроллере)
	if !models.IsValidRole(newRole) {
		return fmt.Errorf("invalid role provided: %s", newRole)
	}
	query := `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`
	result, err := r.db.ExecContext(ctx, query, newRole, userID)
	if err != nil {
		log.Printf("ERROR updating role for user %s: %v", userID, err)
		return fmt.Errorf("%w: failed to update role for user %s: %v", ErrDatabase, userID, err)
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrUserNotFound
	}
	return nil
}


// Helper to get user with password hash (if not already available or to ensure fresh data)
func (r *UserRepository) GetByIDWithPassword(ctx context.Context, id uuid.UUID) (*models.User, error) {
    var user models.User
    query := `SELECT * FROM users WHERE id = $1` // Selects all, including password_hash
    err := r.db.GetContext(ctx, &user, query, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrUserNotFound
        }
        log.Printf("ERROR getting user by ID (with password) %s: %v", id, err)
        return nil, fmt.Errorf("%w: failed to get user by id %s: %v", ErrDatabase, id, err)
    }
    return &user, nil
}

// UpdatePassword updates a user's password_hash.
// It assumes current password has already been verified by the caller (controller/service).
func (r *UserRepository) UpdatePassword(ctx context.Context, userID uuid.UUID, newPasswordHash string) error {
    query := `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`
    result, err := r.db.ExecContext(ctx, query, newPasswordHash, userID)
    if err != nil {
        log.Printf("ERROR updating password for user %s: %v", userID, err)
        return fmt.Errorf("%w: failed to update password for user %s: %v", ErrDatabase, userID, err)
    }
    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        return ErrUserNotFound // Should not happen if userID is from a valid token
    }
    return nil
}
