package handlers

import (
	"machining-erp/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	result := h.authService.Login(req.Username, req.Password)

	if result.Success {
		c.JSON(200, gin.H{
			"success": true,
			"token":   result.Token,
			"user":    result.User,
		})
	} else if result.Locked {
		c.JSON(403, gin.H{
			"success":          false,
			"error":            result.Error,
			"locked":           true,
			"remainingMinutes": result.RemainingMinutes,
		})
	} else {
		c.JSON(401, gin.H{
			"success":           false,
			"error":             result.Error,
			"remainingAttempts": result.RemainingAttempts,
		})
	}
}

func (h *AuthHandler) Status(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	locked, remaining := h.authService.IsLocked()
	if locked {
		c.JSON(200, gin.H{
			"authenticated":    false,
			"locked":           true,
			"remainingMinutes": remaining,
		})
		return
	}

	if token != "" && h.authService.ValidateToken(token) {
		c.JSON(200, gin.H{
			"authenticated": true,
			"user":          h.authService.GetUser(token),
		})
	} else {
		c.JSON(200, gin.H{"authenticated": false})
	}
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}
	h.authService.Logout(token)
	c.JSON(200, gin.H{"success": true})
}
