<template>
  <v-card v-if="timeline && timeline.length > 0" class="mt-6" elevation="8">
    <v-card-title class="text-h5 font-weight-bold">
      Video Timeline
      <v-spacer></v-spacer>
      <v-btn icon @click="copyTimeline" :disabled="!timeline.length">
        <v-icon>mdi-content-copy</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-timeline density="compact" align="start">
        <v-timeline-item
          v-for="(item, index) in timeline"
          :key="index"
          :dot-color="getTimelineColor(index, item)"
          size="small"
        >
          <div class="timeline-item-content">
            <v-chip
              size="small"
              color="primary"
              variant="outlined"
              @click="$emit('seek', item.timestamp)"
              class="timestamp-chip mb-2"
            >
              {{ item.timestampDisplay || item.timestamp }}
            </v-chip>
            <p class="mb-2">{{ item.description }}</p>

            <v-expand-transition v-if="item.audioTranscript">
              <div class="transcript-container audio-transcript">
                <div class="d-flex align-center">
                  <v-icon size="small" color="success" class="mr-2"
                    >mdi-microphone</v-icon
                  >
                  <span class="text-caption text-success"
                    >Audio Transcript:</span
                  >
                </div>
                <p class="transcript-text">{{ item.audioTranscript }}</p>
              </div>
            </v-expand-transition>
          </div>
        </v-timeline-item>
      </v-timeline>
    </v-card-text>
  </v-card>
</template>

<script setup>
const props = defineProps({
  timeline: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["seek"]);

const getTimelineColor = (index, item) => {
  if (item.isAudioTranscript) {
    return "success";
  }
  return index % 2 === 0 ? "primary" : "secondary";
};

const copyTimeline = () => {
  if (!props.timeline.length) return;

  const timelineText = props.timeline
    .map((item) => `${item.timestamp}: ${item.description}`)
    .join("\n");

  navigator.clipboard.writeText(timelineText);
};
</script>

<style scoped>
.timeline-item-content {
  padding: 8px;
}

.timestamp-chip {
  cursor: pointer;
}

.transcript-container {
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.transcript-text {
  margin: 4px 0 0;
  font-style: italic;
}
</style>
