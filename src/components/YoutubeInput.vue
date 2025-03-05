<template>
  <v-form @submit.prevent="$emit('submit', youtubeUrl)">
    <v-text-field
      v-model="youtubeUrl"
      label="YouTube URL"
      placeholder="https://www.youtube.com/watch?v=..."
      variant="outlined"
      :rules="[(v) => !!v || 'URL is required', urlValidator]"
      clearable
      prepend-inner-icon="mdi-youtube"
    ></v-text-field>

    <v-btn
      block
      color="primary"
      size="large"
      type="submit"
      :loading="loading"
      :disabled="!isValidUrl"
    >
      Generate Narrative
    </v-btn>
  </v-form>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["submit"]);

const youtubeUrl = ref("");

const isValidUrl = computed(() => {
  return youtubeUrl.value && urlValidator(youtubeUrl.value) === true;
});

const urlValidator = (url) => {
  try {
    const parsedUrl = new URL(url);
    const isYouTube =
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com" ||
      parsedUrl.hostname === "youtu.be";

    if (!isYouTube) {
      return "Please enter a valid YouTube URL";
    }

    if (parsedUrl.hostname === "youtu.be" && parsedUrl.pathname.length <= 1) {
      return "Invalid YouTube short URL";
    }

    if (
      (parsedUrl.hostname === "youtube.com" ||
        parsedUrl.hostname === "www.youtube.com") &&
      !new URLSearchParams(parsedUrl.search).get("v")
    ) {
      return "Missing video ID in YouTube URL";
    }

    return true;
  } catch (e) {
    return "Please enter a valid URL";
  }
};
</script>
