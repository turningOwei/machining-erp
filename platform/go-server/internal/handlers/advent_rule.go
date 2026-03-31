package handlers

import (
	"machining-erp/internal/models"
	"machining-erp/internal/repository"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AdventRuleHandler struct {
	repo *repository.AdventRuleRepository
}

func NewAdventRuleHandler(repo *repository.AdventRuleRepository) *AdventRuleHandler {
	return &AdventRuleHandler{repo: repo}
}

func (h *AdventRuleHandler) List(c *gin.Context) {
	name := c.Query("name")
	rules, err := h.repo.GetAll(name)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, rules)
}

func (h *AdventRuleHandler) Create(c *gin.Context) {
	var req models.AdventRule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	id, err := h.repo.Create(&req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"id": id})
}

func (h *AdventRuleHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req models.AdventRule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	req.ID = id
	if err := h.repo.Update(&req); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func (h *AdventRuleHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	if err := h.repo.Delete(id); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}
