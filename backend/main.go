package main

import (
	"log"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/config"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/routes"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/tasks"
)

func main() {
    // Load configuration
    cfg := config.LoadConfig()

    // Initialize database
    db, err := config.InitDB(cfg)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    // Setup router
    r := routes.SetupRouter(db)

    sessionRepo := repositories.NewSessionRepository(db)
    userRepo := repositories.NewUserRepository(db)
    notifRepo := repositories.NewNotificationRepository(db)

    // Запуск фоновой задачи для проверки напоминаний (очень упрощенно)
    go tasks.CheckSessionReminders(db, sessionRepo, userRepo, notifRepo) // Передаем зависимости
    // Start server
    log.Printf("Server starting on port %s", cfg.ServerPort)
    if err := r.Run(":" + cfg.ServerPort); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
