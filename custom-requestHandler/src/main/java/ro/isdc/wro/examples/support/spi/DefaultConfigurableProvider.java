package ro.isdc.wro.examples.support.spi;

import java.util.HashMap;
import java.util.Map;

import ro.isdc.wro.http.handler.RequestHandler;
import ro.isdc.wro.util.Ordered;
import ro.isdc.wro.util.provider.ConfigurableProvider;
import ro.isdc.wro.util.provider.ConfigurableProviderSupport;


/**
 * Custom {@link ConfigurableProvider} which registers custom {@link RequestHandler}
 *
 * @author Alex Objelean
 */
public class DefaultConfigurableProvider
    extends ConfigurableProviderSupport
    implements Ordered {

  @Override
  public int getOrder() {
    return 0;
  }

  @Override
  public Map<String, RequestHandler> provideRequestHandlers() {
    final Map<String, RequestHandler> map = new HashMap<String, RequestHandler>();
    map.put("", null);
    return map;
  }
}
