package main

import (
	"log"
    "os"
    "fmt"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/config"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/routes"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/tasks"

    "github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres" // PostgreSQL driver for migrate
	_ "github.com/golang-migrate/migrate/v4/source/file"       // Driver for reading migration files from disk
)

func main() {
    // Загрузка конфигурации
    cfg := config.LoadConfig()
    log.Printf("CONFIG LOADED (from config.LoadConfig): DBUser: %s, DBPassword: [REDACTED], DBName: %s, DBHost: %s, DBPort: %s", cfg.DBUser, cfg.DBName, cfg.DBHost, cfg.DBPort)
    log.Println("Attempting to connect for database migrations...")

    databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		// Note: golang-migrate typically prefers postgresql:// scheme
		databaseURL = fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=disable", // Use disable for local, Render will handle SSL
			cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)
	} else {
		// If DATABASE_URL is from Render, it might already have sslmode.
		// If not, and Render requires SSL, you might need to append ?sslmode=require
		// Check Render's specific connection string format. Often it's pre-configured.
		// For now, assume Render's DATABASE_URL is complete.
	}


	log.Printf("Migration Database URL: %s (Note: password is redacted in production logs if any part is printed)", "[URL_Structure_Only]") // Avoid logging full URL with password

	// Define the path to your migration files
	// This path is relative to where the compiled binary is executed.
	// In your Docker container, it will be /app/db/migrations if you COPY them there.
	migrationsPath := "file://db/migrations"

	// --- If using file-based migrations (ensure files are copied to Docker image) ---
	m, err := migrate.New(migrationsPath, databaseURL)
	// --- End of file-based migrations setup ---

	if err != nil {
		log.Fatalf("Failed to initialize database migration instance: %v\nUsing migrations path: %s\nAnd database URL (structure only): %s", err, migrationsPath, databaseURL)
	}

	log.Println("Applying database migrations...")
	err = m.Up() // Apply all pending up migrations
	if err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Failed to apply database migrations: %v", err)
	}

	if err == migrate.ErrNoChange {
		log.Println("Database schema is up to date. No new migrations applied.")
	} else {
		log.Println("Database migrations applied successfully.")
	}

	// It's good practice to close the migration source and database connections
	// The error from m.Close() returns two errors: one for the source driver, one for the database driver
	sourceErr, dbErr := m.Close()
	if sourceErr != nil {
		log.Printf("Error closing migration source: %v", sourceErr)
	}
	if dbErr != nil {
		log.Printf("Error closing migration database connection: %v", dbErr)
	}

    // Инициализация базы данных
    db, err := config.InitDB(cfg)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    // Настройка маршрутизатора
    r := routes.SetupRouter(db)

    sessionRepo := repositories.NewSessionRepository(db)
    userRepo := repositories.NewUserRepository(db)
    notifRepo := repositories.NewNotificationRepository(db)

    // Запуск фоновой задачи для проверки напоминаний
    go tasks.CheckSessionReminders(db, sessionRepo, userRepo, notifRepo) // Передаем зависимости
    log.Printf("Server starting on port %s", cfg.ServerPort)
    if err := r.Run(":" + cfg.ServerPort); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
