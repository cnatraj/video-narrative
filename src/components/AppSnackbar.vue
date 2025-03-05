<template>
  <v-snackbar v-model="show" :color="color" :timeout="3000">
    {{ text }}
    <template v-slot:actions>
      <v-btn variant="text" @click="show = false"> Close </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      show: false,
      text: "",
      color: "success",
    }),
  },
});

const emit = defineEmits(["update:modelValue"]);

// Local state that mirrors the v-model
const show = ref(props.modelValue.show);
const text = ref(props.modelValue.text);
const color = ref(props.modelValue.color);

// Watch for changes in the v-model
watch(
  () => props.modelValue,
  (newValue) => {
    show.value = newValue.show;
    text.value = newValue.text;
    color.value = newValue.color;
  },
  { deep: true }
);

// Watch for changes in the local show value
watch(show, (newValue) => {
  emit("update:modelValue", {
    ...props.modelValue,
    show: newValue,
  });
});
</script>
