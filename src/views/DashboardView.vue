<template>
  <div class="container">
    <div class="top-bar">
      <h1>🎵 音乐系统控制台</h1>
      <router-link to="/profile" class="profile-link">
        <el-button type="primary">个人信息</el-button>
      </router-link>
    </div>
    
    <div class="dashboard-content">
      <!-- 左侧：热门趋势 -->
      <div class="trending-section">
        <MusicTrending />
      </div>
      
      <!-- 右侧：功能卡片网格 -->
      <div class="cards-grid">
        <!-- 后端状态监测 -->
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>🖥️ 后端状态</span>
            </div>
          </template>
          <div class="status-display">
            <el-tag :type="status === '在线' ? 'success' : 'danger'" size="large">
              {{ status }}
            </el-tag>
            <div style="margin-top: 12px; font-size: 14px; color: #666;">{{ message }}</div>
          </div>
          <el-button type="primary" @click="checkBackend" style="margin-top: 16px; width: 100%;">
            🔄 测试连接
          </el-button>
        </el-card>
        
        <!-- 快速访问 -->
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>🚀 快速访问</span>
            </div>
          </template>
          <div class="quick-links">
            <router-link to="/music" class="quick-link">
              <div class="quick-link-icon">🎵</div>
              <div class="quick-link-text">音乐播放器</div>
            </router-link>
            <router-link to="/music-rankings" class="quick-link">
              <div class="quick-link-icon">📊</div>
              <div class="quick-link-text">排行榜</div>
            </router-link>
            <router-link to="/knowledge-graph" class="quick-link">
              <div class="quick-link-icon">🕸️</div>
              <div class="quick-link-text">知识图谱</div>
            </router-link>
            <router-link to="/game" class="quick-link">
              <div class="quick-link-icon">🎮</div>
              <div class="quick-link-text">小游戏</div>
            </router-link>
          </div>
        </el-card>
        
        <!-- 系统信息 -->
        <el-card class="box-card full-width">
          <template #header>
            <div class="card-header">
              <span>📋 系统信息</span>
            </div>
          </template>
          <div class="system-info">
            <div class="info-item">
              <span class="info-label">前端框架:</span>
              <span class="info-value">Vue 3 + Vite</span>
            </div>
            <div class="info-item">
              <span class="info-label">后端框架:</span>
              <span class="info-value">FastAPI + Python</span>
            </div>
            <div class="info-item">
              <span class="info-label">消息队列:</span>
              <span class="info-value">Apache Kafka</span>
            </div>
            <div class="info-item">
              <span class="info-label">缓存:</span>
              <span class="info-value">Redis</span>
            </div>
            <div class="info-item">
              <span class="info-label">数据存储:</span>
              <span class="info-value">Neo4j + MongoDB</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import MusicTrending from '../components/MusicTrending.vue'

const status = ref('离线')
const message = ref('正在连接...')

const checkBackend = async () => {
  try {
    // 请求后端的根路径
    const res = await request.get('/')
    if (res.data.status === 'success') {
      status.value = '在线'
      message.value = res.data.message
    }
  } catch (error) {
    status.value = '离线'
    message.value = '无法连接到后端，请检查服务是否启动。'
    console.error(error)
  }
}

onMounted(() => {
  checkBackend()
})
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  padding: 40px 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.top-bar {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.top-bar h1 {
  margin: 0;
  font-size: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.profile-link {
  text-decoration: none;
}

.dashboard-content {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.trending-section {
  grid-column: 1;
}

.cards-grid {
  grid-column: 2;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.box-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.box-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.status-display {
  text-align: center;
  padding: 12px;
}

.quick-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-link {
  text-decoration: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  color: white;
  transition: all 0.3s;
  cursor: pointer;
}

.quick-link:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.quick-link-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.quick-link-text {
  font-size: 14px;
  font-weight: 600;
}

.system-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 8px;
}

.info-label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.full-width {
  grid-column: 1 / -1;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
  
  .trending-section {
    grid-column: 1;
  }
  
  .cards-grid {
    grid-column: 1;
  }
  
  .quick-links {
    grid-template-columns: 1fr 1fr;
  }
  
  .system-info {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 20px 12px;
  }
  
  .top-bar h1 {
    font-size: 24px;
  }
  
  .quick-links {
    grid-template-columns: 1fr;
  }
  
  .system-info {
    grid-template-columns: 1fr;
  }
}
</style>
