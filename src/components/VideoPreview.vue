<template>
  <v-card v-if="show" class="mt-6" elevation="8">
    <v-card-title class="text-h5 font-weight-bold">
      Video Preview
    </v-card-title>

    <v-card-text>
      <div class="video-container">
        <iframe
          v-if="embedUrl"
          :src="embedUrl"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="video-iframe"
        ></iframe>
        <video
          v-else-if="videoFileUrl"
          controls
          class="video-player"
          ref="videoPlayer"
        >
          <source :src="videoFileUrl" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  embedUrl: {
    type: String,
    default: "",
  },
  videoFileUrl: {
    type: String,
    default: "",
  },
});

const videoPlayer = ref(null);

// Expose the video player reference to the parent component
defineExpose({
  videoPlayer,
});
</script>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
}

.video-iframe,
.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
