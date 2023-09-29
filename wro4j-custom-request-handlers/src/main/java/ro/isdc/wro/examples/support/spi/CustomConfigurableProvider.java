package ro.isdc.wro.examples.support.spi;

import java.util.HashMap;
import java.util.Map;

import ro.isdc.wro.examples.support.handler.DisableCacheRequestHandler;
import ro.isdc.wro.http.handler.LazyRequestHandlerDecorator;
import ro.isdc.wro.http.handler.RequestHandler;
import ro.isdc.wro.util.LazyInitializer;
import ro.isdc.wro.util.provider.ConfigurableProviderSupport;

/**
 * Registers custom request handler.
 */
public class CustomConfigurableProvider extends ConfigurableProviderSupport {
    @Override
    public Map<String, RequestHandler> provideRequestHandlers() {
        final Map<String, RequestHandler> map = new HashMap<String, RequestHandler>();
        map.put(DisableCacheRequestHandler.ALIAS, new LazyRequestHandlerDecorator(new LazyInitializer<RequestHandler>() {
            @Override
            protected RequestHandler initialize() {
                return new DisableCacheRequestHandler();
            }
        }));
        return map;
    }
}
