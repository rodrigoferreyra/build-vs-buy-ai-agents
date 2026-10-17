/**
 * Video Timeline Configuration - Timeline Controls Bar
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/video-timeline-7a0400/
 */

import type CreativeEditorSDK from '@cesdk/cesdk-js';

export function setupVideoTimeline(cesdk: CreativeEditorSDK): void {
  cesdk.ui.setComponentOrder({ in: 'ly.img.video.timeline.controls.bar' }, [
    'ly.img.video.timeline.background',
    'ly.img.video.timeline.split',
    'ly.img.spacer',
    'ly.img.video.timeline.playbackInfo',
    'ly.img.video.timeline.playPause',
    'ly.img.video.timeline.loop',
    'ly.img.spacer',
    'ly.img.video.timeline.zoom',
    'ly.img.video.timeline.toggle',
  ]);
}
