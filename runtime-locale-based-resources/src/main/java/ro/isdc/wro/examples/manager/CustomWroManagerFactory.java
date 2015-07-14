package ro.isdc.wro.examples.manager;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.http.HttpServletRequest;

import ro.isdc.wro.cache.CacheKey;
import ro.isdc.wro.cache.factory.CacheKeyFactory;
import ro.isdc.wro.cache.factory.DefaultCacheKeyFactory;
import ro.isdc.wro.examples.app.LocaleResolver;
import ro.isdc.wro.manager.factory.ConfigurableWroManagerFactory;

public class CustomWroManagerFactory extends ConfigurableWroManagerFactory {
	private final LocaleResolver localeResolver = new LocaleResolver();

	@Override
	protected CacheKeyFactory newCacheKeyFactory() {
		return new DefaultCacheKeyFactory() {
			@Override
			public CacheKey create(final HttpServletRequest request) {
				final CacheKey key = super.create(request);
				Locale locale = localeResolver.resolve(request);
				key.addAttribute("locale", locale.toString());
				return key;
			};
		};
	}
}
