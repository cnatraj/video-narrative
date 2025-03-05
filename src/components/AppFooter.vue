<template>
  <v-footer app class="d-flex justify-center">
    <span>&copy; {{ currentYear }} YouTube Narrative Service</span>
  </v-footer>
</template>

<script setup>
import { computed } from "vue";

const currentYear = computed(() => new Date().getFullYear());
</script>
