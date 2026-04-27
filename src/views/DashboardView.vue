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
            <router-link to="/dual-fighter" class="quick-link">
              <div class="quick-link-icon">⚔️</div>
              <div class="quick-link-text">双人格斗</div>
            </router-link>
          </div>
        </el-card>
        
        <!-- 日志查询 -->
        <el-card class="box-card">
          <template #header>
            <div class="card-header">
              <span>📊 日志查询</span>
            </div>
          </template>
          <div class="log-search-preview">
            <p style="color: #666; margin-bottom: 12px;">查询系统日志、追踪TraceID</p>
            <el-button type="primary" @click="showLogDialog = true" style="width: 100%;">
              🔍 查询日志
            </el-button>
          </div>
        </el-card>
        
        <!-- 系统信息 -->
        <el-card class="box-card">
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
            <div class="info-item">
              <span class="info-label">搜索引擎:</span>
              <span class="info-value">Elasticsearch</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 日志查询对话框 -->
    <el-dialog v-model="showLogDialog" title="📊 系统日志查询" width="80%" top="5vh">
      <!-- 搜索表单 -->
      <el-form :model="logSearchForm" label-width="100px" size="small">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="关键词">
              <el-input v-model="logSearchForm.keyword" placeholder="输入搜索关键词" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="日志级别">
              <el-select v-model="logSearchForm.level" placeholder="全部" clearable style="width: 100%;">
                <el-option label="DEBUG" value="DEBUG" />
                <el-option label="INFO" value="INFO" />
                <el-option label="WARNING" value="WARNING" />
                <el-option label="ERROR" value="ERROR" />
                <el-option label="CRITICAL" value="CRITICAL" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="模块">
              <el-input v-model="logSearchForm.module" placeholder="模块名称" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户ID">
              <el-input v-model="logSearchForm.user_id" placeholder="输入用户ID" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="TraceID">
              <el-input v-model="logSearchForm.trace_id" placeholder="输入TraceID" clearable />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="logSearchForm.start_time"
                type="datetime"
                placeholder="选择开始时间"
                style="width: 100%;"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="logSearchForm.end_time"
                type="datetime"
                placeholder="选择结束时间"
                style="width: 100%;"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DDTHH:mm:ss"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24" style="text-align: center;">
            <el-button type="primary" @click="searchLogs" :loading="searching">🔍 搜索</el-button>
            <el-button @click="resetSearch">🔄 重置</el-button>
          </el-col>
        </el-row>
      </el-form>

      <!-- 搜索结果 -->
      <div v-if="searchResults.length > 0" style="margin-top: 20px;">
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #666;">找到 {{ searchTotal }} 条日志</span>
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="searchTotal"
            layout="prev, pager, next"
            @current-change="handlePageChange"
            small
          />
        </div>

        <el-table :data="searchResults" stripe size="small" max-height="500">
          <el-table-column prop="timestamp" label="时间" width="180" />
          <el-table-column prop="level" label="级别" width="100">
            <template #default="{ row }">
              <el-tag :type="getLevelTagType(row.level)" size="small">{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="module" label="模块" width="120" />
          <el-table-column prop="user_id" label="用户" width="100" />
          <el-table-column prop="trace_id" label="TraceID" width="200" show-overflow-tooltip />
          <el-table-column label="日志内容" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-html="highlightSearch(row.message)"></span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-else-if="!searching && hasSearched" style="text-align: center; padding: 40px; color: #999;">
        <el-icon :size="48" style="margin-bottom: 12px;"><DocumentDelete /></el-icon>
        <p>暂无匹配的日志记录</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { DocumentDelete } from '@element-plus/icons-vue'
import request from '../utils/request'
import MusicTrending from '../components/MusicTrending.vue'
import { ElMessage } from 'element-plus'

const status = ref('离线')
const message = ref('正在连接...')

// 日志查询相关
const showLogDialog = ref(false)
const searching = ref(false)
const hasSearched = ref(false)
const searchResults = ref([])
const searchTotal = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const logSearchForm = ref({
  keyword: '',
  level: '',
  module: '',
  user_id: '',
  trace_id: '',
  start_time: null,
  end_time: null
})

const checkBackend = async () => {
  try {
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

const searchLogs = async () => {
  searching.value = true
  hasSearched.value = true
  try {
    const params = {
      keyword: logSearchForm.value.keyword,
      level: logSearchForm.value.level,
      module: logSearchForm.value.module,
      user_id: logSearchForm.value.user_id,
      trace_id: logSearchForm.value.trace_id,
      start_time: logSearchForm.value.start_time,
      end_time: logSearchForm.value.end_time,
      size: pageSize.value,
      from_: (currentPage.value - 1) * pageSize.value
    }

    const res = await request.get('/api/logs/search', { params })
    searchResults.value = res.data.logs || []
    searchTotal.value = res.data.total || 0
    ElMessage.success(`找到 ${searchTotal.value} 条日志`)
  } catch (error) {
    console.error('搜索日志失败:', error)
    ElMessage.error('搜索日志失败: ' + (error.response?.data?.detail || error.message))
  } finally {
    searching.value = false
  }
}

const resetSearch = () => {
  logSearchForm.value = {
    keyword: '',
    level: '',
    module: '',
    user_id: '',
    trace_id: '',
    start_time: null,
    end_time: null
  }
  searchResults.value = []
  searchTotal.value = 0
  currentPage.value = 1
  hasSearched.value = false
}

const handlePageChange = (page) => {
  currentPage.value = page
  searchLogs()
}

const getLevelTagType = (level) => {
  const typeMap = {
    'DEBUG': 'info',
    'INFO': 'success',
    'WARNING': 'warning',
    'ERROR': 'danger',
    'CRITICAL': 'danger'
  }
  return typeMap[level] || 'info'
}

const highlightSearch = (text) => {
  if (!logSearchForm.value.keyword || !text) return text
  const keyword = logSearchForm.value.keyword
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark style="background-color: #ffeb3b; color: #000;">$1</mark>')
}

onMounted(() => {
  checkBackend()
})
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  padding: 40px 24px !important;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  max-width: none !important;
  width: 100% !important;
}

.top-bar {
  width: 100%;
  margin: 0 0 40px 0;
  padding: 0;
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
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  display: grid;
  grid-template-columns: minmax(300px, 1fr) 3fr;
  gap: 24px;
  padding: 0 !important;
}

.trending-section {
  grid-column: 1;
}

.cards-grid {
  grid-column: 2;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  align-content: start;
  width: 100%;
}

.box-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  max-width: none !important;
  width: 100% !important;
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
