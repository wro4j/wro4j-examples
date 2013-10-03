package ro.isdc.wro.examples.support.processor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ro.isdc.wro.WroRuntimeException;
import ro.isdc.wro.model.resource.processor.impl.css.CssUrlRewritingProcessor;
import ro.isdc.wro.util.Ordered;


/**
 * A custom implementation of {@link CssUrlRewritingProcessor} which doesn't fail when imageUrl replacement fails
 * (leaving the image url unchanged).
 *
 * @author Alex Objelean
 */
public class CustomCssUrlRewritingProcessor
    extends CssUrlRewritingProcessor {
  private static final Logger LOG = LoggerFactory.getLogger(CustomCssUrlRewritingProcessor.class);
  /**
   * The alias used to register this processor. It is possible to use the same alias as original processor
   * ("cssUrlRewriting"), in such case custom processor will replace the original processor having a higher priority (@see
   * {@link Ordered} interface).
   */
  public static String ALIAS = "customCssUrlRewriting";

  @Override
  protected String replaceImageUrl(final String cssUri, final String imageUrl) {
    try {
      final String replacedCssUri = makeSecure(cssUri);
      return super.replaceImageUrl(replacedCssUri, imageUrl);
    } catch (final WroRuntimeException e) {
      LOG.warn("Original replacement failed because: {}. Leaving imageUrl unchanged.", e.getMessage());
      return imageUrl;
    }
  }

  private String makeSecure(final String cssUri) {
    return cssUri.replace("http://", "https://");
  }
}
