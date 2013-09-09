package ro.isdc.wro.examples.support.manager;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.http.HttpServletRequest;

import ro.isdc.wro.cache.CacheKey;
import ro.isdc.wro.cache.factory.CacheKeyFactory;
import ro.isdc.wro.cache.factory.DefaultCacheKeyFactory;
import ro.isdc.wro.manager.factory.ConfigurableWroManagerFactory;

public class CustomWroManagerFactory extends ConfigurableWroManagerFactory {
  @Override
  protected CacheKeyFactory newCacheKeyFactory() {
    return new DefaultCacheKeyFactory() {
      @Override
      public CacheKey create(final HttpServletRequest request) {
        final CacheKey key = super.create(request);
        key.addAttribute("locale", extractLocale(request.getRequestURI()));
        return key;
      };
    };
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
