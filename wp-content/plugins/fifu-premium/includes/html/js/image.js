jQuery(document).ready(function ($) {
    if (fifuImageVars.fifu_block) {
        jQuery('body').on('contextmenu', 'img', function (e) {
            return false;
        });
    }

    // forwarding
    if (fifuImageVars.fifu_redirection && fifuImageVars.fifu_forwarding_url && !fifuImageVars.fifu_is_front_page) {
        attr = fifuImageVars.fifu_lazy ? 'data-src' : 'src';
        jQuery('img[' + attr + '="' + fifuImageVars.fifu_main_image_url + '"]').wrap('<a href="' + fifuImageVars.fifu_forwarding_url + '" target="_blank"></a>');
    }

    // lazy load
    if (fifuImageVars.fifu_lazy)
        fifu_lazy();
    else {
        // no WordPress lazy load for the top images
        jQuery('img').each(function (index) {
            if (jQuery(this).offset().top < jQuery(window).height()) {
                jQuery(this).removeAttr('loading');
            }
        });
    }

    // for all images on home/shop
    if (fifuImageVars.fifu_should_crop) {
        setTimeout(function () {
            cropImage();
        }, parseInt(fifuImageVars.fifu_crop_delay));
    }

    // hover effects
    if (fifuImageVars.fifu_hover_selected)
        addHoverEffect($);

    // woocommerce lightbox/zoom
    disableClick($);
    disableLink($);

    // zoomImg
    setTimeout(function () {
        jQuery('img.zoomImg').css('z-index', '');
    }, 1000);

    jQuery('img[height=1]').each(function (index) {
        if (jQuery(this).attr('width') != 1)
            jQuery(this).css('position', 'relative');
    });
});

jQuery(document).ajaxComplete(function ($) {
    if (fifuImageVars.fifu_hover_selected)
        addHoverEffect($);

    // image not found
    jQuery('div.woocommerce-product-gallery img').on('error', function () {
        jQuery(this)[0].src = fifuImageVars.fifu_error_url;
    });
});

jQuery(window).on('ajaxComplete', function () {
    if (fifuImageVars.fifu_lazy)
        fifu_lazy();

    // timeout necessary (load more button of Bimber)
    setTimeout(function () {
        if (fifuImageVars.fifu_slider)
            fifu_slider = fifu_load_slider();
    }, 300);
});

jQuery(document).ajaxSuccess(function ($) {
    if (fifuImageVars.fifu_lazy)
        fifu_lazy_ajax();
});

var observer = new MutationObserver(function (mutations) {
    if (fifuImageVars.fifu_lazy) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (jQuery(node).find('img').length > 0) {
                    // ignore WooCommerce zoom
                    if (!jQuery(node).hasClass('pswp__zoom-wrap')) {
                        jQuery(node).find('img').each(function (index) {
                            // dont touch on slider
                            if (jQuery(this).attr('src') == 'null' || jQuery(this).hasClass('lazyload') || jQuery(this).parent().hasClass('lg-thumb-item') || jQuery(this).parent().hasClass('lslide') || jQuery(this).parent().hasClass('lg-img-wrap'))
                                return;

                            fifu_lazy_ajax(this);
                        });
                    }
                    return;
                } else if (jQuery(node).prop('tagName') == 'IMG') {
                    // ignore WooCommerce zoom
                    if (!jQuery(node).hasClass('zoomImg'))
                        fifu_lazy_ajax(node);
                    return;
                }
            });
        });
    }
});
observer.observe(document, {attributes: false, childList: true, characterData: false, subtree: true});

function addHoverEffect($) {
    var selector = fifuImageVars.fifu_hover_selector;

    jQuery('.post-thumbnail, .featured-image > a > img, div.thumbnail > a > img, .featured-media > a > img' + (selector ? ',' + selector : '')).each(function (index) {
        if (fifuImageVars.fifu_is_front_page)
            jQuery(this).replaceWith('<div id="hover" class="' + fifuImageVars.fifu_hover + '"><div><figure>'.concat(jQuery(this).parent().html()).concat('</figure></div></div>'));
    });

    jQuery('img.attachment-woocommerce_thumbnail').each(function (index) {
        // ignore if the image is not in main area
        if (jQuery(this).parent().parent().html().search('woocommerce-LoopProduct-link') < 0)
            return;
        if (fifuImageVars.fifu_is_shop)
            jQuery(this).replaceWith('<div id="hover" class="' + fifuImageVars.fifu_hover + '"><div><figure>'.concat(jQuery(this).context.outerHTML).concat('</figure></div></div>'));
    });

    // selector for shop
    if (selector) {
        jQuery(selector).each(function (index) {
            if (fifuImageVars.fifu_is_shop)
                jQuery(this).replaceWith('<div id="hover" class="' + fifuImageVars.fifu_hover + '"><div><figure>'.concat(jQuery(this).parent().html()).concat('</figure></div></div>'));
        });
    }
}

function cropImage(selector) {
    if (!selector)
        selector = fifuImageVars.fifu_crop_default + fifuImageVars.fifu_crop_selectors;

    // get selectors and set individual ratios in a dictionary
    sel = selector.split(',');
    dictRatio = {};
    dicFit = {};
    selector = '';
    for (i = 0; i < sel.length; i++) {
        arr = sel[i].split('|');
        if (arr.length > 1) {
            dictRatio[i] = arr[1];
            if (arr.length > 2)
                dicFit[i] = arr[2];
        }
        selector += arr[0];
        if (i + 1 < sel.length)
            selector += ', ';
    }

    fit = fifuImageVars.fifu_fit;

    // get global ratio
    global_ratio = fifuImageVars.fifu_crop_ratio;
    global_ratio_w = global_ratio.split(':')[0];
    global_ratio_h = global_ratio.split(':')[1];

    // for each selector
    sel = selector.split(',');
    for (i = 0; i < sel.length; i++) {

        // define which ratio will be used
        if (dictRatio) {
            local_ratio = dictRatio[i];
            ratio_w = local_ratio ? local_ratio.split(':')[0] : global_ratio_w;
            ratio_h = local_ratio ? local_ratio.split(':')[1] : global_ratio_h;
        }

        // define which fit will be used
        if (dicFit) {
            local_fit = dicFit[i];
            fit = local_fit ? local_fit : fit;
        }

        jQuery(sel[i]).each(function (index) {
            // ignore fifu slider
            if (sel[i].trim() === '.fifu-slider')
                return;

            var width;
            var backend = false;
            // a.g1-frame-inner is for bimber theme
            jQuery(this).find('img, a.g1-frame').each(function (index) {
                // ignore
                ignoreSelectors = fifuImageVars.fifu_crop_ignore_parent.split(',');
                skip = false;
                for (j = 0; j < ignoreSelectors.length; j++) {
                    if (jQuery(this).parent().is(ignoreSelectors[j])) {
                        skip = true;
                        break
                    }
                }
                if (skip)
                    return;

                // from backend
                theme_width = jQuery(this).attr('theme-width');
                theme_height = jQuery(this).attr('theme-height');

                // from frontend
                if (!width) {
                    width = jQuery(this).parent().css('width').replace('px', '');
                    width = width != 0 ? width : jQuery(this).parent().parent().css('width').replace('px', '');
                    width = width != 0 ? width : jQuery(this).parent().parent().parent().css('width').replace('px', '');
                }
                if (width == '100%') {
                    width = jQuery(this).parent()[0].clientWidth;
                    width = width != 0 ? width : jQuery(this).parent().parent()[0].clientWidth;
                    width = width != 0 ? width : jQuery(this).parent().parent().parent()[0].clientWidth;
                }

                if (isValidImgClass(jQuery(this).attr('class'))) {
                    if (fifuImageVars.fifu_should_crop_with_theme_sizes && (backend || (theme_width && theme_height && theme_height != 9999))) {
                        backend = true;
                        // backend
                        jQuery(this).attr('style', jQuery(this).attr('style') + ';height: ' + (width * theme_height / theme_width) + 'px !important');
                    } else {
                        // frontend
                        jQuery(this).attr('style', jQuery(this).attr('style') + ';height: ' + (width * ratio_h / ratio_w) + 'px !important');
                    }
                    if (jQuery(this)[0].clientHeight > jQuery(this)[0].clientWidth)
                        jQuery(this).css('width', '100%');
                    else
                        jQuery(this).css('width', width + 'px !important');

                    jQuery(this).css('object-fit', fit ? fit : 'cover');

                    // position
                    position = jQuery(this).attr('fifu-position');
                    if (position) {
                        jQuery(this).css('object-position', position);
                        jQuery(this).removeAttr('fifu-position');
                    }
                }
            });

            // background images
            jQuery(this).find('*[style*="background-image"]').each(function (index) {
                jQuery(this).css('background-size', fit);
            });
        });
    }

    jQuery('a.woocommerce-LoopProduct-link').css('width', '100%');
}

function isValidImgClass(className) {
    // bimber
    return !className || !className.includes('avatar');
}

function disableClick($) {
    if (!fifuImageVars.fifu_woo_lbox_enabled) {
        firstParentClass = '';
        parentClass = '';
        jQuery('figure.woocommerce-product-gallery__wrapper').find('div.woocommerce-product-gallery__image').each(function (index) {
            parentClass = jQuery(this).parent().attr('class').split(' ')[0];
            if (!firstParentClass)
                firstParentClass = parentClass;

            if (parentClass != firstParentClass)
                return false;

            jQuery(this).children().click(function () {
                return false;
            });
            jQuery(this).children().children().css("cursor", "default");
        });
    }
}

function disableLink($) {
    if (!fifuImageVars.fifu_woo_lbox_enabled) {
        firstParentClass = '';
        parentClass = '';
        jQuery('figure.woocommerce-product-gallery__wrapper').find('div.woocommerce-product-gallery__image').each(function (index) {
            parentClass = jQuery(this).parent().attr('class').split(' ')[0];
            if (!firstParentClass)
                firstParentClass = parentClass;

            if (parentClass != firstParentClass)
                return false;

            jQuery(this).children().attr("href", "");
        });
    }
}

jQuery(document).ajaxSuccess(function () {
    if (fifuImageVars.fifu_should_crop) {
        setTimeout(function () {
            cropImage();
        }, parseInt(fifuImageVars.fifu_crop_delay));
    }
});

jQuery(document).click(function ($) {
    fifu_fix_gallery_height();
})

function fifu_fix_gallery_height() {
    if (fifuImageVars.fifu_is_flatsome_active) {
        mainImage = jQuery('.woocommerce-product-gallery__wrapper div.flickity-viewport').find('img')[0];
        if (mainImage)
            jQuery('.woocommerce-product-gallery__wrapper div.flickity-viewport').css('height', mainImage.clientHeight + 'px');
    }
}

// var resizeWindowTimeout;
// jQuery(window).on('resize', function (e) {
// clearTimeout(resizeWindowTimeout);
// resizeWindowTimeout = setTimeout(fifu_resize_slider, 100);
// });

// for infinite scroll
jQuery(document.body).on('post-load', function () {
    if (fifuImageVars.fifu_lazy)
        fifu_lazy();

    setTimeout(function () {
        if (fifuImageVars.fifu_slider)
            fifu_slider = fifu_load_slider();
    }, 300);
});

jQuery('img.lazy').on('appear', function () {
    if (fifuImageVars.fifu_should_crop)
        cropImage();
});

// fix conflict between lazyload and slider (height:0px)
jQuery('ul#image-gallery > li > img').on('load', function () {
    if (fifuImageVars.fifu_lazy && !fifuImageVars.fifu_slider_vertical) {
        if (jQuery(this).parent().hasClass('active'))
            jQuery(this).parent().parent().css('height', this.clientHeight);
    }
});
