<template>
  <v-card v-if="summary" class="mt-6" elevation="8">
    <v-card-title class="text-h5 font-weight-bold">
      Video Summary
    </v-card-title>

    <v-card-text>
      <p class="summary-text">{{ summary }}</p>
      <v-alert v-if="truncatedInfo" type="info" class="mt-4">
        {{ truncatedInfo }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  summary: {
    type: String,
    default: "",
  },
  truncatedInfo: {
    type: String,
    default: "",
  },
});
</script>

<style scoped>
.summary-text {
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>
