// tasks/reminders.go
package tasks

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/jmoiron/sqlx"
)

// CheckSessionReminders периодически проверяет сессии и отправляет напоминания
func CheckSessionReminders(
    db *sqlx.DB, // Для возможного прямого доступа, если понадобится
    sessionRepo *repositories.SessionRepository,
    userRepo *repositories.UserRepository, // Для получения участников
    notifRepo *repositories.NotificationRepository,
) {
	ticker := time.NewTicker(1 * time.Hour) // Проверять каждый час 
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			log.Println("INFO: Checking for session reminders...")
			err := processReminders(context.Background(), sessionRepo, userRepo, notifRepo)
			if err != nil {
				log.Printf("ERROR processing reminders: %v", err)
			}
		}
	}
}

func processReminders(
    ctx context.Context,
    sessionRepo *repositories.SessionRepository,
    userRepo *repositories.UserRepository,
    notifRepo *repositories.NotificationRepository,
) error {

	now := time.Now()
	upcomingSessions, err := sessionRepo.GetSessionsStartingSoon(ctx, now.Add(24*time.Hour)) // Нужен новый метод в repo
	if err != nil {
		return fmt.Errorf("failed to get upcoming sessions: %w", err)
	}

	for _, session := range upcomingSessions {
		// Проверяем, не прошло ли уже время сессии (на всякий случай)
		if session.DateTime.Before(now) {
			continue
		}

		// Получаем участников сессии
        // Метод GetParticipants уже есть в SessionRepository, он возвращает []models.User
		participants, err := sessionRepo.GetParticipants(ctx, session.ID)
		if err != nil {
			log.Printf("WARN: Failed to get participants for session %s for reminder: %v", session.ID, err)
			continue
		}

		for _, participant := range participants {

			notifMsg := fmt.Sprintf("Reminder: Your session '%s' is starting on %s.",
				session.Title, session.DateTime.Format("Jan 2, 2006 at 3:04 PM"))

			newNotif := models.Notification{
				UserID:      participant.ID,
				Message:     notifMsg,
				Type:        models.NotificationTypeSessionReminder,
				RelatedID:   &session.ID,
				RelatedType: "session",
			}
			_, errNotif := notifRepo.CreateNotification(ctx, newNotif)
			if errNotif != nil {
				log.Printf("WARN: Failed to create reminder notification for user %s session %s: %v", participant.ID, session.ID, errNotif)
			} else {
                log.Printf("INFO: Sent reminder for session %s to user %s", session.ID, participant.ID)
            }
		}
	}
	return nil
}
