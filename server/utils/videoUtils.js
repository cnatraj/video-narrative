/**
 * Utility functions for video processing
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Format a timestamp in seconds to HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
export const formatTimestamp = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
};

/**
 * Compare two frames to determine if they are significantly different
 * Uses a simple file size and basic image properties comparison
 * @param {string} frame1Path - Path to the first frame
 * @param {string} frame2Path - Path to the second frame
 * @param {number} threshold - Threshold for determining significant difference (0-1, lower = more sensitive)
 * @returns {Promise<boolean>} - Whether the frames are significantly different
 */
export const compareFrames = async (
  frame1Path,
  frame2Path,
  threshold = 0.25
) => {
  try {
    // Simple comparison based on file properties
    // This avoids using ffmpeg filters that might cause crashes

    // Get file stats
    const stats1 = fs.statSync(frame1Path);
    const stats2 = fs.statSync(frame2Path);

    // Calculate size difference as a percentage
    const maxSize = Math.max(stats1.size, stats2.size);
    const minSize = Math.min(stats1.size, stats2.size);
    const sizeDifference = (maxSize - minSize) / maxSize;

    // If size difference is above threshold, consider frames different
    const isDifferent = sizeDifference > threshold;

    console.log(
      `File size difference: ${(sizeDifference * 100).toFixed(
        2
      )}%, Threshold: ${threshold * 100}%, Is Different: ${isDifferent}`
    );

    return isDifferent;
  } catch (error) {
    console.error("Error in compareFrames:", error);
    // If comparison fails, assume frames are different
    return true;
  }
};

/**
 * Find the transcript segment that corresponds to a specific timestamp
 * @param {number} timeSeconds - Timestamp in seconds
 * @param {Array<Object>} transcriptData - Array of transcript segments with timestamps
 * @returns {string|null} - Transcript text for the timestamp or null if not found
 */
export const findTranscriptForTimestamp = (timeSeconds, transcriptData) => {
  if (!transcriptData || !transcriptData.length) {
    return null;
  }

  // Find the transcript segment that includes this timestamp
  for (const segment of transcriptData) {
    if (timeSeconds >= segment.start && timeSeconds <= segment.end) {
      return segment.text;
    }
  }

  // If no exact match, find the closest segment
  let closestSegment = null;
  let minDistance = Infinity;

  for (const segment of transcriptData) {
    // Calculate distance to segment start and end
    const distanceToStart = Math.abs(timeSeconds - segment.start);
    const distanceToEnd = Math.abs(timeSeconds - segment.end);
    const minSegmentDistance = Math.min(distanceToStart, distanceToEnd);

    if (minSegmentDistance < minDistance) {
      minDistance = minSegmentDistance;
      closestSegment = segment;
    }
  }

  // Only return if the closest segment is within 5 seconds
  if (closestSegment && minDistance <= 5) {
    return closestSegment.text;
  }

  return null;
};

/**
 * Find all transcript segments that fall within a time range
 * @param {number} startTimeSeconds - Start timestamp in seconds
 * @param {number} endTimeSeconds - End timestamp in seconds
 * @param {Array<Object>} transcriptData - Array of transcript segments with timestamps
 * @returns {string|null} - Combined transcript text for the time range or null if none found
 */
export const findTranscriptRangeForTimestamp = (
  startTimeSeconds,
  endTimeSeconds,
  transcriptData
) => {
  if (!transcriptData || !transcriptData.length) {
    return null;
  }

  // Find all transcript segments that overlap with the time range
  const rangeSegments = transcriptData.filter((segment) => {
    // Segment starts within the range (inclusive start, exclusive end)
    const startsInRange =
      segment.start >= startTimeSeconds && segment.start < endTimeSeconds;

    // Segment ends within the range (exclusive start, exclusive end)
    const endsInRange =
      segment.end > startTimeSeconds && segment.end < endTimeSeconds;

    // Segment completely contains the range
    const containsRange =
      segment.start <= startTimeSeconds && segment.end >= endTimeSeconds;

    return startsInRange || endsInRange || containsRange;
  });

  if (rangeSegments.length === 0) {
    return null;
  }

  // Sort segments by start time
  rangeSegments.sort((a, b) => a.start - b.start);

  // Combine all segment texts
  return rangeSegments.map((segment) => segment.text).join(" ");
};

/**
 * Clean up old processing files
 * @param {string} framesDir - Directory containing frame files
 * @param {string} outputDir - Directory containing output files
 * @param {string} audioDir - Directory containing audio files
 * @param {string} cacheDir - Directory containing cache files
 * @param {number} maxAgeHours - Maximum age in hours before deletion
 * @returns {Promise<number>} - Number of files/directories deleted
 */
export const cleanupOldProcessingFiles = async (
  framesDir,
  outputDir,
  audioDir,
  cacheDir,
  maxAgeHours = 24
) => {
  try {
    console.log(
      `Cleaning up processing files older than ${maxAgeHours} hours...`
    );
    let deletedCount = 0;
    const now = Date.now();

    // Clean up frames directory
    if (fs.existsSync(framesDir)) {
      const frameDirs = fs.readdirSync(framesDir);

      for (const dir of frameDirs) {
        const dirPath = path.join(framesDir, dir);
        const stats = fs.statSync(dirPath);
        const fileAgeHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (fileAgeHours > maxAgeHours) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          deletedCount++;
          console.log(`Deleted old frames directory: ${dir}`);
        }
      }
    }

    // Clean up output directory
    if (fs.existsSync(outputDir)) {
      const outputFiles = fs.readdirSync(outputDir);

      for (const file of outputFiles) {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        const fileAgeHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (fileAgeHours > maxAgeHours) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old output file: ${file}`);
        }
      }
    }

    // Clean up audio directory
    if (fs.existsSync(audioDir)) {
      const audioFiles = fs.readdirSync(audioDir);

      for (const file of audioFiles) {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        const fileAgeHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (fileAgeHours > maxAgeHours) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old audio file: ${file}`);
        }
      }
    }

    // Clean up cache directory (with a longer retention period)
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir);
      const cacheMaxAgeHours = maxAgeHours * 2; // Keep cache files longer

      for (const file of cacheFiles) {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        const fileAgeHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (fileAgeHours > cacheMaxAgeHours) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old cache file: ${file}`);
        }
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up old processing files:", error);
    return 0;
  }
};
