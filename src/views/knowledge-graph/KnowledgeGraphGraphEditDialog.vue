<template>
  <el-dialog
    v-model="visibleProxy"
    width="980px"
    destroy-on-close
    class="graph-edit-dialog"
  >
    <template #header>
      <div class="graph-edit-header">
        <div class="graph-edit-title">编辑问答图谱</div>
        <div class="graph-edit-subtitle">支持修改实体名称、实体类型、关系名称，以及关系连接的起点和终点。</div>
      </div>
    </template>

    <div class="graph-edit-section">
      <div class="graph-edit-section-title">实体</div>
      <el-table :data="editableSubgraph.nodes" stripe max-height="260">
        <el-table-column label="实体 ID" min-width="220">
          <template #default="{ row }">
            <span class="graph-edit-id">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <el-input v-model="row.label" placeholder="Entity name" />
          </template>
        </el-table-column>
        <el-table-column label="类型" min-width="160">
          <template #default="{ row }">
            <el-input v-model="row.type" placeholder="例如 Person / Org / Entity" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="graph-edit-section">
      <div class="graph-edit-section-title">关系</div>
      <el-table :data="editableSubgraph.edges" stripe max-height="280">
        <el-table-column label="关系 ID" min-width="180">
          <template #default="{ row }">
            <span class="graph-edit-id">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关系名称" min-width="160">
          <template #default="{ row }">
            <el-input v-model="row.label" placeholder="Relation name" />
          </template>
        </el-table-column>
        <el-table-column label="起点实体" min-width="190">
          <template #default="{ row }">
            <el-select v-model="row.source" placeholder="选择起点实体" filterable style="width: 100%">
              <el-option
                v-for="node in editableNodeOptions"
                :key="node.value"
                :label="node.label"
                :value="node.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="终点实体" min-width="190">
          <template #default="{ row }">
            <el-select v-model="row.target" placeholder="选择终点实体" filterable style="width: 100%">
              <el-option
                v-for="node in editableNodeOptions"
                :key="node.value"
                :label="node.label"
                :value="node.value"
              />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <div class="graph-edit-footer">
        <el-button @click="visibleProxy = false">取消</el-button>
        <el-button type="primary" :loading="savingGraphEdits" @click="$emit('save')">
          保存修改
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  editableNodeOptions: {
    type: Array,
    default: () => []
  },
  editableSubgraph: {
    type: Object,
    required: true
  },
  savingGraphEdits: {
    type: Boolean,
    default: false
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['save', 'update:visible'])

const visibleProxy = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})
</script>
