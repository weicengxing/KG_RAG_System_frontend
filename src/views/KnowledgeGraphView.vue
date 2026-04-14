<template>
  <div class="knowledge-graph-container">
    <div class="bg-aurora" aria-hidden="true"></div>

    <div class="content-wrapper">
      <el-card class="page-header" shadow="never">
        <div class="header-inner">
          <div class="brand">
            <div class="brand-icon">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="brand-text">
              <h1 class="title">知识图谱 RAG 系统</h1>
              <p class="subtitle">上传文档、选择文件、拖拽上传、知识图谱问答</p>
            </div>
          </div>

          <div class="header-meta">
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 0 }"></span>
              <span class="label">上传</span>
            </div>
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 1 }"></span>
              <span class="label">分块</span>
            </div>
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 2 }"></span>
              <span class="label">抽取</span>
            </div>
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 3 }"></span>
              <span class="label">图谱</span>
            </div>
          </div>
        </div>
      </el-card>

      <el-tabs v-model="activeTab" class="main-tabs">
        <el-tab-pane label="图谱构建" name="build">
          <KnowledgeGraphBuildTab v-model:current-step="currentStep" :active="activeTab === 'build'" />
        </el-tab-pane>
        <el-tab-pane label="知识问答" name="qa">
          <KnowledgeGraphQATab />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Connection } from '@element-plus/icons-vue'
import KnowledgeGraphBuildTab from './knowledge-graph/KnowledgeGraphBuildTab.vue'
import KnowledgeGraphQATab from './knowledge-graph/KnowledgeGraphQATab.vue'

const activeTab = ref('build')
const currentStep = ref(0)
</script>

<style scoped src="./knowledge-graph/styles/base.css"></style>
<style src="./knowledge-graph/styles/dialogs.css"></style>
