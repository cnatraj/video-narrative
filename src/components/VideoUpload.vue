<template>
  <div
    class="upload-container"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    :class="{ dragging: isDragging }"
  >
    <input
      type="file"
      ref="fileInput"
      accept="video/*"
      class="hidden-input"
      @change="handleFileSelect"
    />

    <div class="upload-content" @click="triggerFileInput">
      <v-icon size="64" color="primary" class="mb-4">{{
        hasFile ? "mdi-check-circle" : "mdi-upload"
      }}</v-icon>
      <h3 class="text-h6 mb-2">
        {{ hasFile ? "Video Selected" : "Upload Video" }}
      </h3>
      <p class="text-body-1 text-medium-emphasis mb-2">
        {{
          hasFile
            ? selectedFileName
            : "Drag and drop your video here or click to browse"
        }}
      </p>
      <p class="text-caption text-medium-emphasis">
        {{ hasFile ? fileSize : "Supported formats: MP4, WebM, MOV" }}
      </p>

      <v-btn
        v-if="hasFile"
        color="error"
        variant="text"
        class="mt-2"
        @click.stop="clearFile"
      >
        Remove Video
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps({
  modelValue: {
    type: File,
    default: null,
  },
});

const fileInput = ref(null);
const isDragging = ref(false);

const hasFile = computed(() => !!props.modelValue);
const selectedFileName = computed(() => props.modelValue?.name || "");
const fileSize = computed(() => {
  if (!props.modelValue) return "";
  const size = props.modelValue.size;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
});

const triggerFileInput = () => {
  if (!hasFile.value) {
    fileInput.value.click();
  }
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    emit("update:modelValue", file);
  }
};

const handleDragOver = (event) => {
  isDragging.value = true;
  event.dataTransfer.dropEffect = "copy";
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith("video/")) {
    emit("update:modelValue", file);
  }
};

const clearFile = (event) => {
  event.stopPropagation();
  emit("update:modelValue", null);
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};
</script>

<style scoped>
.upload-container {
  border: 2px dashed rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 24px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-container:hover {
  border-color: var(--v-primary-base);
  background-color: rgba(var(--v-primary-base), 0.04);
}

.upload-container.dragging {
  border-color: var(--v-primary-base);
  background-color: rgba(var(--v-primary-base), 0.08);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hidden-input {
  display: none;
}
</style>
