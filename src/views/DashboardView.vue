<template>
  <div class="container">
    <div class="top-bar">
      <h1>毕设项目控制台</h1>
      <router-link to="/profile" class="profile-link">
        <el-button type="primary">个人信息</el-button>
      </router-link>
    </div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>后端状态监测</span>
        </div>
      </template>
      <div class="status-display">
        <el-tag :type="status === '在线' ? 'success' : 'danger'" size="large">
          {{ status }}
        </el-tag>
        <div style="margin-top: 20px;">{{ message }}</div>
      </div>
      <el-button type="primary" @click="checkBackend" style="margin-top: 20px;">
        测试连接
      </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const status = ref('离线')
const message = ref('正在连接...')

const checkBackend = async () => {
  try {
    // 请求后端的根路径
    const res = await axios.get('http://localhost:8000/')
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
  align-items: center;
  padding-top: 50px;
}

.top-bar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 0 20px;
}

.profile-link {
  text-decoration: none;
}

.box-card {
  width: 480px;
}
</style>