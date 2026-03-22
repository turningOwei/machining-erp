package services

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type LoginState struct {
	Attempts    int
	LockedUntil *time.Time
}

type AuthService struct {
	mu             sync.RWMutex
	loginState     LoginState
	activeSessions map[string]bool
	maxAttempts    int
	lockDuration   time.Duration
	adminUser      string
	adminPassword  string
}

func NewAuthService(adminUser, adminPassword string, maxAttempts int, lockDuration time.Duration) *AuthService {
	return &AuthService{
		activeSessions: make(map[string]bool),
		maxAttempts:    maxAttempts,
		lockDuration:   lockDuration,
		adminUser:      adminUser,
		adminPassword:  adminPassword,
	}
}

func (s *AuthService) generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

type LoginResult struct {
	Success           bool
	Token             string
	User              *UserInfo
	Error             string
	Locked            bool
	RemainingMinutes  int
	RemainingAttempts int
}

type UserInfo struct {
	Username string `json:"username"`
}

func (s *AuthService) Login(username, password string) *LoginResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()

	// 检查账户是否锁定
	if s.loginState.LockedUntil != nil && now.Before(*s.loginState.LockedUntil) {
		remaining := int(s.loginState.LockedUntil.Sub(now).Minutes())
		return &LoginResult{
			Success:          false,
			Locked:           true,
			Error:            "账户已锁定",
			RemainingMinutes: remaining,
		}
	}

	// 检查锁定是否过期
	if s.loginState.LockedUntil != nil && now.After(*s.loginState.LockedUntil) {
		s.loginState.Attempts = 0
		s.loginState.LockedUntil = nil
	}

	// 验证凭据
	if username == s.adminUser && password == s.adminPassword {
		s.loginState.Attempts = 0
		s.loginState.LockedUntil = nil

		token := s.generateToken()
		s.activeSessions[token] = true

		return &LoginResult{
			Success: true,
			Token:   token,
			User:    &UserInfo{Username: s.adminUser},
		}
	}

	// 登录失败
	s.loginState.Attempts++
	remaining := s.maxAttempts - s.loginState.Attempts

	if s.loginState.Attempts >= s.maxAttempts {
		lockedUntil := now.Add(s.lockDuration)
		s.loginState.LockedUntil = &lockedUntil
		return &LoginResult{
			Success:          false,
			Locked:           true,
			Error:            "登录失败次数过多，账户已锁定2小时",
			RemainingMinutes: 120,
		}
	}

	return &LoginResult{
		Success:           false,
		Error:             "账号或密码错误",
		RemainingAttempts: remaining,
	}
}

func (s *AuthService) ValidateToken(token string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.activeSessions[token]
}

func (s *AuthService) Logout(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.activeSessions, token)
}

func (s *AuthService) IsLocked() (bool, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.loginState.LockedUntil == nil {
		return false, 0
	}

	now := time.Now()
	if now.Before(*s.loginState.LockedUntil) {
		remaining := int(s.loginState.LockedUntil.Sub(now).Minutes())
		return true, remaining
	}
	return false, 0
}

func (s *AuthService) GetUser(token string) *UserInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.activeSessions[token] {
		return &UserInfo{Username: s.adminUser}
	}
	return nil
}
