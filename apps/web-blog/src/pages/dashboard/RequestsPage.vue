<script setup lang="ts">
import { NButton, NCard, NEmpty, NSpace, NSpin, NAlert, NTag, NInput, NModal } from 'naive-ui';
import { API } from '@/constants';
import { onMounted, ref } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';

type PermissionRequest = {
  id: number;
  user_id: string;
  entity_type: 'tag' | 'category' | null;
  entity_data: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  decision_reason: string | null;
  created_at: string;
};

const loading = ref(false);
const acting = ref(false);
const error = ref('');
const requests = ref<PermissionRequest[]>([]);
const showRejectModal = ref(false);
const rejectReason = ref('');
const selectedId = ref<number | null>(null);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await http.get<ApiResponse<PermissionRequest[]>>(API.PERMISSION_REQUESTS);
    requests.value = res.data ?? [];
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

async function approve(id: number) {
  acting.value = true;
  try {
    await http.post(API.PERMISSION_REQUEST_APPROVE(id), {});
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '审批失败';
  } finally {
    acting.value = false;
  }
}

function openReject(id: number) {
  selectedId.value = id;
  rejectReason.value = '';
  showRejectModal.value = true;
}

async function confirmReject() {
  if (selectedId.value === null) return;
  acting.value = true;
  try {
    await http.post(API.PERMISSION_REQUEST_REJECT(selectedId.value), {
      reason: rejectReason.value || undefined,
    });
    showRejectModal.value = false;
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '拒绝失败';
  } finally {
    acting.value = false;
  }
}

function parseEntityData(data: string | null): Record<string, string> | null {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function statusType(status: string): 'warning' | 'success' | 'error' | 'default' {
  if (status === 'PENDING') return 'warning';
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  return 'default';
}

function statusLabel(status: string): string {
  if (status === 'PENDING') return '待审批';
  if (status === 'APPROVED') return '已通过';
  if (status === 'REJECTED') return '已拒绝';
  return status;
}

onMounted(load);
</script>

<template>
  <n-spin :show="loading">
    <n-alert v-if="error" type="error" :show-icon="false" class="alert">{{ error }}</n-alert>

    <div class="page-header">
      <h2 class="page-title">审批请求</h2>
    </div>

    <template v-if="requests.length">
      <n-card v-for="req in requests" :key="req.id" size="small" class="request-card">
        <div class="request-row">
          <div class="request-info">
            <div class="request-type">
              <n-tag :type="statusType(req.status)" size="small"
                >{{ statusLabel(req.status) }}</n-tag
              >
              <span class="entity-type"
                >{{ req.entity_type === 'tag' ? '标签' : req.entity_type === 'category' ? '分类' : '未知' }}</span
              >
            </div>
            <div class="request-detail">
              <template v-if="req.entity_data">
                <div
                  v-for="(val, key) in parseEntityData(req.entity_data)"
                  :key="key"
                  class="detail-row"
                >
                  <span class="detail-key">{{ key }}:</span>
                  <span class="detail-val">{{ val }}</span>
                </div>
              </template>
              <div v-if="req.reason" class="detail-row">
                <span class="detail-key">原因:</span>
                <span class="detail-val">{{ req.reason }}</span>
              </div>
            </div>
            <div v-if="req.decision_reason" class="decision-reason">
              审批意见: {{ req.decision_reason }}
            </div>
          </div>
          <div v-if="req.status === 'PENDING'" class="request-actions">
            <n-button size="tiny" type="primary" :loading="acting" @click="approve(req.id)"
              >通过</n-button
            >
            <n-button size="tiny" type="error" :loading="acting" @click="openReject(req.id)"
              >拒绝</n-button
            >
          </div>
        </div>
      </n-card>
    </template>
    <n-empty v-else description="暂无审批请求" />

    <n-modal v-model:show="showRejectModal" title="拒绝审批" preset="card" style="max-width: 400px">
      <n-input
        v-model:value="rejectReason"
        type="textarea"
        placeholder="拒绝原因（可选）"
        :rows="3"
      />
      <template #footer>
        <n-button @click="showRejectModal = false">取消</n-button>
        <n-button type="error" :loading="acting" @click="confirmReject">确认拒绝</n-button>
      </template>
    </n-modal>
  </n-spin>
</template>

<style scoped>
.alert {
  margin-bottom: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}
.request-card {
  border-radius: 12px;
  margin-bottom: 8px;
}
.request-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.request-info {
  flex: 1;
  min-width: 0;
}
.request-type {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.entity-type {
  font-size: 14px;
  font-weight: 600;
}
.request-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-row {
  display: flex;
  gap: 6px;
  font-size: 13px;
}
.detail-key {
  color: var(--app-text-secondary);
}
.detail-val {
  color: var(--app-text);
}
.decision-reason {
  margin-top: 6px;
  font-size: 12px;
  color: var(--app-text-tertiary);
  font-style: italic;
}
.request-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
