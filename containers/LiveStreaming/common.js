let AgoraRTC = ""
if (typeof window != "undefined") {
  AgoraRTC = require('agora-rtc-sdk');
}
export function addView (id, show) {
  if (!$('#' + id)[0]) {
    $('<div/>', {
      id: 'remote_video_panel_' + id,
      class: 'video-view',
    }).appendTo('#video')

    $('<div/>', {
      id: 'remote_video_' + id,
      class: 'video-placeholder',
    }).appendTo('#remote_video_panel_' + id)

    $('<div/>', {
      id: 'remote_video_info_' + id,
      class: 'video-profile ' + (show ? '' :  'hide'),
    }).appendTo('#remote_video_panel_' + id)

    $('<div/>', {
      id: 'video_autoplay_'+ id,
      class: 'autoplay-fallback hide',
    }).appendTo('#remote_video_panel_' + id)
  }
}

export function removeView (id) {
  if ($('#remote_video_panel_' + id)[0]) {
    $('#remote_video_panel_'+id).remove()
  }
}

export function getDevices (next) {
  AgoraRTC.getDevices(function (items) {
    items.filter(function (item) {
      return ['audioinput', 'videoinput'].indexOf(item.kind) !== -1
    })
      .map(function (item) {
        return {
          name: item.label,
          value: item.deviceId,
          kind: item.kind,
        }
      })
    var videos = []
    var audios = []
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      if ('videoinput' == item.kind) {
        let name = item.label
        let value = item.deviceId
        if (!name) {
          name = 'camera-' + videos.length
        }
        videos.push({
          name: name,
          value: value,
          kidn: item.kind
        })
      }
      if ('audioinput' == item.kind) {
        var name = item.label
        var value = item.deviceId
        if (!name) {
          name = 'microphone-' + audios.length
        }
        audios.push({
          name: name,
          value: value,
          kidn: item.kind
        })
      }
    }
    next({videos: videos, audios: audios})
  })
}