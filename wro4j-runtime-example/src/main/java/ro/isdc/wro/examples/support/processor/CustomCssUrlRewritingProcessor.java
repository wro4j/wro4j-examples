package ro.isdc.wro.examples.support.processor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ro.isdc.wro.model.resource.processor.impl.css.CssUrlRewritingProcessor;
import ro.isdc.wro.util.Ordered;


/**
 * A custom implementation of {@link CssUrlRewritingProcessor} which use https scheme for all external resources.
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
    final String replacedCssUri = makeSecure(cssUri);
    return super.replaceImageUrl(replacedCssUri, imageUrl);
  }

  private String makeSecure(final String cssUri) {
    return cssUri.replace("http://", "https://");
  }
}
