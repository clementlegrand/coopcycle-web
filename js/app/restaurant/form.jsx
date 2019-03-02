import React from 'react'
import { render } from 'react-dom'
import Switch from 'antd/lib/switch'
import Dropzone from 'dropzone'
import Croppie from 'croppie'
import i18n from '../i18n'

function renderSwitch($input) {

  const $parent = $input.closest('div.checkbox').parent()

  const $switch = $('<div class="display-inline-block">')
  const $hidden = $('<input>')

  $switch.addClass('switch')

  $hidden
    .attr('type', 'hidden')
    .attr('name', $input.attr('name'))
    .attr('value', $input.attr('value'))

  $parent.prepend($switch)

  const checked = $input.is(':checked'),
    disabled = $input.is(':disabled')

  if (checked) {
    $parent.prepend($hidden)
  }

  $input.closest('div.checkbox').remove()

  render(
    <Switch defaultChecked={ checked }
      checkedChildren={ i18n.t('ENABLED') }
      unCheckedChildren={ i18n.t('DISABLED') }
      onChange={(checked) => {
        if (checked) {
          $parent.append($hidden)
        } else {
          $hidden.remove()
        }
      }}
      disabled={disabled} />, $switch.get(0)
  )

}

Dropzone.autoDiscover = false

$(function() {

  // Render Switch on page load
  $('form[name="restaurant"]').find('.switch').each((index, el) => renderSwitch($(el)))

  window.CoopCycle.DeliveryZonePicker(
    $('#restaurant_deliveryPerimeterExpression__picker').get(0),
    {
      zones: window.AppData.zones,
      expression: window.AppData.deliveryPerimeterExpression,
      onExprChange: (expr) => { $('#restaurant_deliveryPerimeterExpression').val(expr)}
    }
  )

  $('#restaurant_imageFile_delete').closest('.form-group').remove()

  const $formGroup = $('#restaurant_imageFile_file').closest('.form-group')

  $formGroup.empty()

  const $dropzoneContainer = $('<div>')
  $dropzoneContainer.attr('id', 'restaurant-image-dropzone')
  $dropzoneContainer.addClass('dropzone')
  $dropzoneContainer.addClass('dropzone--blue')
  $dropzoneContainer.appendTo($formGroup)

  const formData = document.querySelector('#restaurant-form-data')

  $dropzoneContainer.dropzone({
    url: formData.dataset.actionUrl,
    acceptedFiles: 'image/*',
    resizeMimeType: 'image/jpeg',
    // maxFiles: 1,
    thumbnailWidth: 256,
    thumbnailHeight: 256,
    // thumbnailMethod: 'contain',
    params: {
      restaurant: formData.dataset.restaurantId
    },
    dictDefaultMessage: i18n.t('DROPZONE_DEFAULT_MESSAGE'),
    init: function() {

      var dz = this

      // Remove other thumbnails on upload success
      this.on('success', function(file) {
        dz.files.forEach(oneFile => {
          if (oneFile !== file) {
            dz.removeFile(oneFile)
          }
        })
      })

      // @see https://github.com/enyo/dropzone/wiki/FAQ#how-to-show-files-already-stored-on-server
      if (formData.dataset.restaurantImage) {
        $.ajax({
          type: 'HEAD',
          async: true,
          url: formData.dataset.restaurantImage,
          success: function(message, text, jqXHR) {

            const filesize = jqXHR.getResponseHeader('Content-Length')
            const filename = formData.dataset.restaurantImage.substr(formData.dataset.restaurantImage.lastIndexOf('/') + 1)

            var mockFile = { name: filename, size: filesize }

            dz.files.push(mockFile)
            dz.emit('addedfile', mockFile)
            dz.emit('thumbnail', mockFile, formData.dataset.restaurantImage)
            dz.emit('complete', mockFile)
          }
        })
      }

    },
    // @see https://itnext.io/integrating-dropzone-with-javascript-image-cropper-optimise-image-upload-e22b12ac0d8a
    transformFile: function(file, done) {

      var dz = this

      // Create the image editor overlay
      var editor = document.createElement('div')
      editor.style.position = 'fixed'
      editor.style.left = 0
      editor.style.right = 0
      editor.style.top = 0
      editor.style.bottom = 0
      editor.style.zIndex = 9999
      editor.style.paddingTop = '100px'
      editor.style.paddingBottom = '100px'
      editor.style.backgroundColor = '#fff'

      document.body.appendChild(editor)

      // Create confirm button at the top left of the viewport
      var buttonConfirm = document.createElement('button')
      buttonConfirm.style.position = 'absolute'
      buttonConfirm.style.left = '10px'
      buttonConfirm.style.top = '10px'
      buttonConfirm.style.zIndex = 9999
      buttonConfirm.innerHTML = '<i class="fa fa-check"></i> ' + i18n.t('CROPPIE_CONFIRM')

      buttonConfirm.classList.add('btn')
      buttonConfirm.classList.add('btn-success')

      editor.appendChild(buttonConfirm)

      var buttonClose = document.createElement('button')

      buttonClose.style.position = 'absolute'
      buttonClose.style.right = '10px'
      buttonClose.style.top = '10px'
      buttonClose.style.zIndex = 9999
      buttonClose.textContent = '×'
      buttonClose.innerHTML = '<i class="fa fa-close"></i> ' + i18n.t('CROPPIE_CANCEL')

      buttonClose.classList.add('btn')
      buttonClose.classList.add('btn-danger')

      editor.appendChild(buttonClose)

      buttonClose.addEventListener('click', function() {
        dz.removeFile(file)
        document.body.removeChild(editor)
      })

      buttonConfirm.addEventListener('click', function() {

        // Get the output file data from Croppie
        croppie.result({
          type:'blob',
          size: {
            width: 256,
            height: 256
          },
          format: 'jpeg'
        }).then(function(blob) {

          // Create a new Dropzone file thumbnail
          dz.createThumbnail(
            blob,
            dz.options.thumbnailWidth,
            dz.options.thumbnailHeight,
            dz.options.thumbnailMethod,
            false,
            function(dataURL) {

              // Update the Dropzone file thumbnail
              dz.emit('thumbnail', file, dataURL)

              // Tell Dropzone of the new file
              done(blob)

            })
        })

        // Remove the editor from the view
        document.body.removeChild(editor)

      })

      // Create the Croppie editor
      var croppie = new Croppie(editor, {
        enableResize: false,
        viewport: {
          width: 256,
          height: 256,
          type: 'square'
        }
      })

      // Tell Croppie to load the file
      croppie.bind({
        url: URL.createObjectURL(file)
      })

    },
  })
})
