// repositories/user_repository_test.go
package repositories_test

import (
	"context"
	"errors"
	"regexp" // Для sqlmock
	"testing"
	"time"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq" // Для pq.Array и pq.Error
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserRepository_UpdateUserRole_Success(t *testing.T) {
	db, mock, err := sqlmock.New() // Используем sqlmock
	require.NoError(t, err)
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock") // Оборачиваем в sqlx.DB
	userRepo := repositories.NewUserRepository(sqlxDB)

	userID := uuid.New()
	newRole := models.RoleModerator

	// Ожидаем SQL-запрос
    // regexp.QuoteMeta экранирует спецсимволы в SQL для точного совпадения
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`)).
		WithArgs(newRole, userID).         // Ожидаемые аргументы
		WillReturnResult(sqlmock.NewResult(0, 1)) // Ожидаем, что 1 строка была изменена

	err = userRepo.UpdateUserRole(context.Background(), userID, newRole)

	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet()) // Проверяем, что все ожидания sqlmock выполнены
}

func TestUserRepository_UpdateUserRole_UserNotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	userRepo := repositories.NewUserRepository(sqlxDB)

	userID := uuid.New()
	newRole := models.RoleAdmin

	mock.ExpectExec(regexp.QuoteMeta(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`)).
		WithArgs(newRole, userID).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 строк изменено

	err = userRepo.UpdateUserRole(context.Background(), userID, newRole)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, repositories.ErrUserNotFound))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_UpdateUserRole_InvalidRole(t *testing.T) {
	db, _, err := sqlmock.New() // mock не используется, т.к. до SQL не дойдет
	require.NoError(t, err)
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	userRepo := repositories.NewUserRepository(sqlxDB)

	userID := uuid.New()
	invalidRole := models.Role("superadmin") // Невалидная роль

	err = userRepo.UpdateUserRole(context.Background(), userID, invalidRole)

	assert.Error(t, err)
}


func TestUserRepository_CreateUser_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()
	sqlxDB := sqlx.NewDb(db, "sqlmock")
	userRepo := repositories.NewUserRepository(sqlxDB)

	req := models.RegisterRequest{
		Email:    "newuser@example.com",
		Password: "password123", // Сам пароль не хранится, передается хеш
		Name:     "New User",
		Skills:   []string{"Go", "Testing"},
		Role:     string(models.RoleUser), // Используем string, как в RegisterRequest
	}
	passwordHash := "$2a$10$somebcryptgeneratedhash" // Пример хеша

	rows := sqlmock.NewRows([]string{"id", "email", "oauth_provider", "oauth_id", "name", "bio", "skills", "average_rating", "created_at", "updated_at", "role"}).
		AddRow(uuid.New(), req.Email, nil, nil, req.Name, nil, pq.Array(req.Skills), 0.0, time.Now(), time.Now(), req.Role)

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO users (email, password_hash, name, bio, skills, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING`)). // Частичное совпадение
        WithArgs(req.Email, passwordHash, req.Name, sqlmock.AnyArg(), pq.Array(req.Skills), models.RoleUser). // sqlmock.AnyArg() для bio (sql.NullString)
		WillReturnRows(rows)

	createdUser, err := userRepo.CreateUser(context.Background(), req, passwordHash)

	assert.NoError(t, err)
	require.NotNil(t, createdUser)
	assert.Equal(t, req.Email, createdUser.Email)
	assert.Equal(t, req.Name, createdUser.Name)
	assert.Equal(t, string(models.RoleUser), createdUser.Role) // Сравниваем строки, т.к. в модели User роль - string
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_CreateUser_DuplicateEmail(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()
	sqlxDB := sqlx.NewDb(db, "sqlmock")
	userRepo := repositories.NewUserRepository(sqlxDB)

	req := models.RegisterRequest{Email: "duplicate@example.com", Name: "Duplicate", Password: "pw"}
	passwordHash := "hash"

    // Ожидаем ошибку unique_violation от PostgreSQL (код '23505')
	pgErr := &pq.Error{Code: "23505", Message: "unique constraint violation"}
	mock.ExpectQuery(`INSERT INTO users`). // Упрощенное ожидание запроса
		WithArgs(req.Email, passwordHash, req.Name, sqlmock.AnyArg(), pq.Array(req.Skills), models.RoleUser).
		WillReturnError(pgErr)

	_, err = userRepo.CreateUser(context.Background(), req, passwordHash)

	assert.Error(t, err)
    // Проверяем, что ошибка содержит сообщение о дубликате email, которое формирует репозиторий
	assert.Contains(t, err.Error(), "user with email 'duplicate@example.com' already exists")
	assert.NoError(t, mock.ExpectationsWereMet())
}
