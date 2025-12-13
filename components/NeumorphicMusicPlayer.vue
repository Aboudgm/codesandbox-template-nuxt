<template>
  <div class="music-player-container">
    <!-- Phone Frame -->
    <div class="phone-frame">
      <!-- Notch Area -->
      <div class="notch"></div>

      <!-- Header -->
      <div class="header">
        <button class="nav-button" @click="goBack">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h1 class="title">PLAYING NOW</h1>
        <button class="nav-button" @click="openMenu">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      </div>

      <!-- Album Art Wrapper -->
      <div class="art-wrapper">
        <div class="album-art-container">
          <div :class="{ playing: isPlaying }" class="album-art">
            <img
              src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
              alt="Album Art"
              class="album-image"
            />
          </div>

          <!-- Curved Progress Bar -->
          <div class="progress-container">
            <svg class="progress-bar" viewBox="0 0 100 50">
              <!-- Progress Track -->
              <path
                d="M 10 40 A 30 30 0 0 1 90 40"
                stroke="#d1d5db"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
              />
              <!-- Progress Fill -->
              <path
                d="M 10 40 A 30 30 0 0 1 90 40"
                :stroke="isPlaying ? '#3b82f6' : '#6b7280'"
                stroke-width="3"
                fill="none"
                stroke-linecap="round"
                :style="{
                  strokeDasharray: progressCircumference,
                  strokeDashoffset: progressValue,
                }"
                class="progress-fill"
              />
              <!-- Progress Knob -->
              <circle
                cx="90"
                cy="40"
                r="4"
                :fill="isPlaying ? '#3b82f6' : '#6b7280'"
                class="progress-knob"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Song Info -->
      <div class="song-info">
        <h2 class="song-title">Blinding Lights</h2>
        <p class="artist-name">The Weeknd</p>
      </div>

      <!-- Time Display -->
      <div class="time-display">
        <span class="current-time">{{ currentTime }}</span>
        <span class="total-time">{{ totalTime }}</span>
      </div>

      <!-- Control Buttons -->
      <div class="controls">
        <button
          :class="{ active: isShuffled }"
          class="control-btn secondary"
          @click="toggleShuffle"
        >
          <i class="fas fa-random"></i>
        </button>

        <button class="control-btn secondary" @click="previousTrack">
          <i class="fas fa-step-backward"></i>
        </button>

        <button class="control-btn play-pause" @click="togglePlayPause">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>

        <button class="control-btn secondary" @click="nextTrack">
          <i class="fas fa-step-forward"></i>
        </button>

        <button
          :class="{ active: isRepeating }"
          class="control-btn secondary"
          @click="toggleRepeat"
        >
          <i class="fas fa-redo"></i>
        </button>
      </div>

      <!-- Large Play Button -->
      <div class="large-play-section">
        <button class="large-play-btn" @click="togglePlayPause">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'NeumorphicMusicPlayer',

  data() {
    return {
      isPlaying: false,
      isShuffled: false,
      isRepeating: false,
      currentTime: '01:23',
      totalTime: '03:16',
      progress: 65, // percentage
      progressRadius: 30,
      progressCircumference: 2 * Math.PI * 30,
      progressOffset: 0,
    }
  },

  computed: {
    progressValue(): number {
      const offset =
        this.progressCircumference -
        (this.progress / 100) * this.progressCircumference
      return offset
    },
  },

  mounted() {
    // Initialize progress offset
    this.progressOffset =
      this.progressCircumference -
      (this.progress / 100) * this.progressCircumference
  },

  methods: {
    togglePlayPause() {
      this.isPlaying = !this.isPlaying

      // Add haptic feedback simulation
      if (this.isPlaying) {
        this.startProgressAnimation()
      } else {
        this.stopProgressAnimation()
      }
    },

    toggleShuffle() {
      this.isShuffled = !this.isShuffled
    },

    toggleRepeat() {
      this.isRepeating = !this.isRepeating
    },

    previousTrack() {
      // Add previous track logic here
    },

    nextTrack() {
      // Add next track logic here
    },

    goBack() {
      // Add navigation logic here
    },

    openMenu() {
      // Add menu logic here
    },

    startProgressAnimation() {
      // Simulate progress animation
      const interval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(interval)
          return
        }

        // Simple progress simulation
        if (this.progress < 100) {
          this.progress += 0.1
          this.updateCurrentTime()
          this.updateProgressOffset()
        } else {
          this.progress = 0
          this.currentTime = '00:00'
        }
      }, 1000)
    },

    stopProgressAnimation() {
      // Progress animation will stop naturally when isPlaying becomes false
    },

    updateCurrentTime() {
      const totalSeconds = Math.floor((this.progress / 100) * 196) // 3:16 = 196 seconds
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      this.currentTime = `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
    },

    updateProgressOffset() {
      // Recalculate progress offset based on current progress
    },
  },
})
</script>

<style scoped>
/* CSS Custom Properties */
:root {
  --bg-color: #eff0f3;
  --dark-shadow: #b8bcc4;
  --light-shadow: #ffffff;
  --text-dark: #0f1829;
  --text-secondary: #6b7280;
  --accent-color: #3b82f6;
  --button-bg: #f3f4f6;
}

/* Reset and base styles */
.music-player-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--bg-color);
  font-family: 'Poppins', sans-serif;
  padding: 20px;
}

.phone-frame {
  width: 375px;
  height: 812px;
  background: var(--bg-color);
  border-radius: 40px;
  position: relative;
  box-shadow: 20px 20px 40px var(--dark-shadow),
    -20px -20px 40px var(--light-shadow);
  overflow: hidden;
}

.notch {
  width: 120px;
  height: 30px;
  background: var(--bg-color);
  border-radius: 0 0 20px 20px;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

/* Header Styles */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 60px 30px 30px;
  position: relative;
  z-index: 5;
}

.nav-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-color);
  border: none;
  box-shadow: 5px 5px 10px var(--dark-shadow),
    -5px -5px 10px var(--light-shadow);
  color: var(--text-dark);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: 7px 7px 14px var(--dark-shadow),
    -7px -7px 14px var(--light-shadow);
}

.nav-button:active {
  box-shadow: inset 5px 5px 10px var(--dark-shadow),
    inset -5px -5px 10px var(--light-shadow);
}

.title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-dark);
  margin: 0;
}

/* Album Art Container */
.art-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 30px;
}

.album-art-container {
  position: relative;
  width: 280px;
  height: 280px;
}

.album-art {
  width: 100%;
  height: 100%;
  border-radius: 140px 140px 0 0;
  overflow: hidden;
  box-shadow: 15px 15px 30px var(--dark-shadow),
    -15px -15px 30px var(--light-shadow);
  transition: all 0.3s ease;
}

.album-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.album-art.playing .album-image {
  transform: scale(1.05);
}

/* Progress Bar */
.progress-container {
  position: absolute;
  bottom: -10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
}

.progress-bar {
  width: 200px;
  height: 100px;
}

.progress-fill {
  transition: stroke-dashoffset 0.3s ease;
}

.progress-knob {
  transition: all 0.3s ease;
}

/* Song Info */
.song-info {
  text-align: center;
  padding: 20px 30px;
}

.song-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-dark);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.artist-name {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 400;
}

/* Time Display */
.time-display {
  display: flex;
  justify-content: space-between;
  padding: 0 50px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Control Buttons */
.controls {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 30px 40px;
}

.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: var(--bg-color);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 5px 5px 10px var(--dark-shadow),
    -5px -5px 10px var(--light-shadow);
}

.control-btn:hover {
  transform: translateY(-2px);
  color: var(--text-dark);
  box-shadow: 7px 7px 14px var(--dark-shadow),
    -7px -7px 14px var(--light-shadow);
}

.control-btn:active,
.control-btn.active {
  box-shadow: inset 5px 5px 10px var(--dark-shadow),
    inset -5px -5px 10px var(--light-shadow);
  color: var(--accent-color);
}

.control-btn.secondary {
  width: 45px;
  height: 45px;
  font-size: 14px;
}

.play-pause {
  width: 65px;
  height: 65px;
  font-size: 20px;
  background: var(--text-dark);
  color: white;
  box-shadow: 8px 8px 16px var(--dark-shadow),
    -8px -8px 16px var(--light-shadow);
}

.play-pause:hover {
  background: #1e293b;
  transform: translateY(-3px);
}

.play-pause:active {
  box-shadow: inset 8px 8px 16px #0a0f1a, inset -8px -8px 16px #1a2435;
}

/* Large Play Button */
.large-play-section {
  display: flex;
  justify-content: center;
  padding: 20px 0 40px;
}

.large-play-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: var(--text-dark);
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 10px 10px 20px var(--dark-shadow),
    -10px -10px 20px var(--light-shadow);
}

.large-play-btn:hover {
  transform: translateY(-3px);
  background: #1e293b;
  box-shadow: 12px 12px 24px var(--dark-shadow),
    -12px -12px 24px var(--light-shadow);
}

.large-play-btn:active {
  box-shadow: inset 10px 10px 20px #0a0f1a, inset -10px -10px 20px #1a2435;
}

/* Responsive Design */
@media (max-width: 480px) {
  .phone-frame {
    width: 320px;
    height: 640px;
  }

  .album-art-container {
    width: 240px;
    height: 240px;
  }

  .album-art {
    border-radius: 120px 120px 0 0;
  }

  .controls {
    padding: 20px 30px;
  }

  .control-btn {
    width: 45px;
    height: 45px;
    font-size: 14px;
  }

  .play-pause {
    width: 55px;
    height: 55px;
    font-size: 18px;
  }

  .large-play-btn {
    width: 70px;
    height: 70px;
    font-size: 20px;
  }
}

/* Animation keyframes */
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.album-art.playing {
  animation: pulse 2s infinite ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.phone-frame {
  animation: fadeIn 0.6s ease-out;
}
</style>
