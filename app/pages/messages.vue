<script setup lang="ts">
import type { ContactMessageItem } from '~/types/settings'

definePageMeta({ layout: 'dashboard' })

const { messages, isLoading, errorMessage, fetchMessages, markAsRead, fetchUnreadCount } = useContactMessages()
const { replies, isLoadingReplies, isSubmittingReply, replyErrorMessage, fetchReplies, createReply } = useContactReplies()

const ADMIN_CHAT_POLL_INTERVAL_MS = 12000

const selectedContactId = ref('')
const replyText = ref('')
let adminPollTimer: ReturnType<typeof setInterval> | null = null

function isTabActive() {
  if (!import.meta.client) return true
  return document.visibilityState === 'visible'
}

const selectedContact = computed<ContactMessageItem | null>(() => {
  return messages.value.find(item => item.id === selectedContactId.value) || null
})

const combinedConversation = computed(() => {
  const items: Array<{ id: string, sender_role: string, sender_name: string, message: string, created_at: string }> = []
  if (selectedContact.value) {
    items.push({
      id: `origin-${selectedContact.value.id}`,
      sender_role: 'customer',
      sender_name: selectedContact.value.name,
      message: selectedContact.value.message,
      created_at: selectedContact.value.created_at
    })
  }

  for (const reply of replies.value) {
    items.push(reply)
  }

  return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
})

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('th-TH')
}

async function loadContacts() {
  await fetchMessages({
    page: 1,
    size: 100,
    sort_by: 'created_at',
    order_by: 'desc'
  })
}

async function openConversation(item: ContactMessageItem) {
  selectedContactId.value = item.id
  if (!item.is_read) {
    const ok = await markAsRead(item.id, true)
    if (ok) {
      item.is_read = true
      item.read_at = new Date().toISOString()
      await fetchUnreadCount()
    }
  }

  await fetchReplies(item.id)
}

async function submitReply() {
  const message = String(replyText.value || '').trim()
  if (!selectedContactId.value || !message) return

  const ok = await createReply(selectedContactId.value, { message })
  if (!ok) return

  replyText.value = ''
}

function stopAdminPolling() {
  if (!adminPollTimer) return
  clearInterval(adminPollTimer)
  adminPollTimer = null
}

function startAdminPolling() {
  if (!import.meta.client || adminPollTimer) return

  adminPollTimer = setInterval(async () => {
    if (!isTabActive()) {
      return
    }

    if (isLoading.value || isLoadingReplies.value || isSubmittingReply.value) {
      return
    }

    await loadContacts()

    if (selectedContactId.value) {
      await fetchReplies(selectedContactId.value)
    } else if (messages.value.length > 0) {
      const firstContact = messages.value[0]
      if (firstContact) {
        selectedContactId.value = firstContact.id
        await fetchReplies(firstContact.id)
      }
    }

    await fetchUnreadCount()
  }, ADMIN_CHAT_POLL_INTERVAL_MS)
}

async function refreshAdminNow() {
  await loadContacts()

  if (selectedContactId.value) {
    await fetchReplies(selectedContactId.value)
  } else if (messages.value.length > 0) {
    const firstContact = messages.value[0]
    if (firstContact) {
      selectedContactId.value = firstContact.id
      await fetchReplies(firstContact.id)
    }
  }

  await fetchUnreadCount()
}

async function handleVisibilityChange() {
  if (!isTabActive()) {
    stopAdminPolling()
    return
  }

  await refreshAdminNow()
  startAdminPolling()
}

onMounted(async () => {
  await loadContacts()
  if (messages.value.length > 0) {
    await openConversation(messages.value[0])
  }

  if (isTabActive()) {
    startAdminPolling()
  }

  if (import.meta.client) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
  stopAdminPolling()
})
</script>

<template>
  <div class="messages-page">
    <div class="page-header">
      <h1 class="page-title">หน้าข้อความ</h1>
      <p class="page-subtitle">สนทนาตอบกลับลูกค้าที่ส่งข้อความติดต่อเข้ามา</p>
    </div>

    <div class="chat-layout">
      <aside class="chat-sidebar">
        <div class="sidebar-header">รายการลูกค้าที่ติดต่อ</div>
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <div v-if="isLoading" class="loading-text">กำลังโหลดรายการ...</div>

        <button
          v-for="item in messages"
          :key="item.id"
          type="button"
          class="contact-item"
          :class="{ 'is-active': item.id === selectedContactId }"
          @click="openConversation(item)"
        >
          <div class="contact-item-head">
            <span class="contact-name">{{ item.name }}</span>
            <span v-if="!item.is_read" class="contact-unread-dot"></span>
          </div>
          <p class="contact-subject">{{ item.subject }}</p>
          <p class="contact-time">{{ formatDateTime(item.created_at) }}</p>
        </button>
      </aside>

      <section class="chat-main">
        <template v-if="selectedContact">
          <div class="chat-header">
            <h2 class="chat-title">{{ selectedContact.subject }}</h2>
            <p class="chat-meta">{{ selectedContact.name }} · {{ selectedContact.email }}</p>
          </div>

          <p v-if="replyErrorMessage" class="error-text">{{ replyErrorMessage }}</p>
          <div class="chat-body">
            <div v-if="isLoadingReplies" class="loading-text">กำลังโหลดบทสนทนา...</div>

            <div
              v-for="entry in combinedConversation"
              :key="entry.id"
              class="chat-bubble"
              :class="entry.sender_role === 'admin' ? 'is-admin' : 'is-customer'"
            >
              <div class="bubble-head">
                <span class="bubble-sender">{{ entry.sender_name }}</span>
                <span class="bubble-time">{{ formatDateTime(entry.created_at) }}</span>
              </div>
              <p class="bubble-message">{{ entry.message }}</p>
            </div>
          </div>

          <form class="chat-form" @submit.prevent="submitReply">
            <textarea
              v-model="replyText"
              class="chat-input"
              placeholder="พิมพ์ข้อความตอบกลับลูกค้า"
              rows="3"
              :disabled="isSubmittingReply"
            ></textarea>
            <button type="submit" class="send-button" :disabled="isSubmittingReply || !replyText.trim()">
              {{ isSubmittingReply ? 'กำลังส่ง...' : 'ส่งข้อความ' }}
            </button>
          </form>
        </template>

        <div v-else class="empty-chat">เลือกรายการข้อความทางซ้ายเพื่อเริ่มสนทนา</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.messages-page { max-width: 1400px; margin: 0 auto; width: 100%; }
.page-header { margin-bottom: 24px; }
.page-title { margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; }
.page-subtitle { margin: 6px 0 0 0; font-size: 14px; color: #64748b; }
.chat-layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; min-height: 640px; }
.chat-sidebar,.chat-main { border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.chat-sidebar { padding: 12px; overflow-y: auto; }
.sidebar-header { font-size: 14px; font-weight: 700; color: #334155; margin: 4px 6px 12px; }
.contact-item { width: 100%; text-align: left; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 10px; cursor: pointer; margin-bottom: 8px; }
.contact-item.is-active { border-color: #4f46e5; background: #eef2ff; }
.contact-item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.contact-name { font-size: 14px; font-weight: 700; color: #1e293b; }
.contact-unread-dot { width: 8px; height: 8px; border-radius: 999px; background: #dc2626; }
.contact-subject { margin: 4px 0 0; font-size: 13px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.contact-time { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }

.chat-main { display: flex; flex-direction: column; min-height: 640px; }
.chat-header { padding: 16px; border-bottom: 1px solid #e2e8f0; }
.chat-title { margin: 0; font-size: 18px; color: #0f172a; }
.chat-meta { margin: 4px 0 0; font-size: 13px; color: #64748b; }
.chat-body { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f8fafc; }
.chat-bubble { max-width: min(90%, 620px); border-radius: 12px; padding: 10px 12px; border: 1px solid #e2e8f0; }
.chat-bubble.is-customer { align-self: flex-start; background: #ffffff; }
.chat-bubble.is-admin { align-self: flex-end; background: #eef2ff; border-color: #c7d2fe; }
.bubble-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.bubble-sender { font-size: 12px; font-weight: 700; color: #334155; }
.bubble-time { font-size: 11px; color: #64748b; }
.bubble-message { margin: 0; font-size: 14px; color: #0f172a; white-space: pre-wrap; }

.chat-form { padding: 12px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: flex-end; }
.chat-input { flex: 1; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 14px; color: #1e293b; background: #fff; resize: vertical; min-height: 76px; }
.send-button { height: 42px; border: none; border-radius: 10px; background: #4f46e5; color: #fff; font-weight: 700; padding: 0 16px; cursor: pointer; }
.send-button:disabled { opacity: 0.65; cursor: not-allowed; }

.error-text { color: #b91c1c; font-size: 13px; margin: 4px 6px; }
.loading-text { color: #64748b; font-size: 13px; margin: 4px 6px; }
.empty-chat { margin: auto; color: #64748b; font-size: 14px; }

@media (max-width: 1023px) {
  .chat-layout { grid-template-columns: 1fr; min-height: 0; }
  .chat-main { min-height: 520px; }
}
</style>
