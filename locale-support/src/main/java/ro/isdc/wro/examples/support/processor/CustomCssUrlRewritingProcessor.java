package ro.isdc.wro.examples.support.processor;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ro.isdc.wro.WroRuntimeException;
import ro.isdc.wro.config.ReadOnlyContext;
import ro.isdc.wro.model.group.Inject;
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

  @Inject
  private ReadOnlyContext context;

  @Override
  protected String replaceImageUrl(final String cssUri, final String imageUrl) {
    try {
      final String uri = context.getRequest().getRequestURI();
      final String locale = extractLocale(uri);
      String newImageUrl = imageUrl;
      if (locale != null) {
        newImageUrl = locale + imageUrl;
      }
      return super.replaceImageUrl(cssUri, newImageUrl);
    } catch (final WroRuntimeException e) {
      LOG.warn("Original replacement failed because: {}. Leaving imageUrl unchanged.", e.getMessage());
      return imageUrl;
    }
  }

  private String extractLocale(final String uri) {
    final Pattern pattern = Pattern.compile(".*/locale/(.*)/.*");
    final Matcher m = pattern.matcher(uri);
    String locale = null;
    if (m.find()) {
      locale = m.group(1);
    }
    return locale;
  }
}
