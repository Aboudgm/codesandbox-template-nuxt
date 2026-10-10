---
title: NeumorphicMusicPlayer
type: component
tags:
  - component
  - vue
source: components/NeumorphicMusicPlayer.vue
used_by:
  - "[[Architecture]]"
methods: 14
created: 2026-10-10
---

# NeumorphicMusicPlayer

Source: `components/NeumorphicMusicPlayer.vue` (graph degree 16, god-node cluster: Community 1).

## Lifecycle / data

- `data()` L126, `progressValue()` L141, `mounted()` L149

## Playback

- `togglePlayPause()` L157 → `startProgressAnimation()` L192 / `stopProgressAnimation()` L212
- `updateCurrentTime()` L216, `updateProgressOffset()` L225
- `previousTrack()` L176, `nextTrack()` L180
- `toggleShuffle()` L168, `toggleRepeat()` L172

## Nav

- `goBack()` L184, `openMenu()` L188

> [!note] Imported by
> `pages/index.vue` L7. See [[Architecture]].
