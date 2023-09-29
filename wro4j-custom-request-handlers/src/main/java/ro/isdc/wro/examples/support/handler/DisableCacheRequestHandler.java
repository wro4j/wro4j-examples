package ro.isdc.wro.examples.support.handler;

import java.io.IOException;

import org.apache.commons.lang3.BooleanUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ro.isdc.wro.cache.CacheKey;
import ro.isdc.wro.cache.CacheStrategy;
import ro.isdc.wro.cache.CacheValue;
import ro.isdc.wro.config.ReadOnlyContext;
import ro.isdc.wro.http.handler.RequestHandler;
import ro.isdc.wro.http.handler.RequestHandlerSupport;
import ro.isdc.wro.model.group.GroupExtractor;
import ro.isdc.wro.model.group.Inject;
import ro.isdc.wro.model.resource.ResourceType;

/**
 * <p>This RequestHandler will reload the cache only for a specific group. When the requested url contains a param, it will invalidate the
 * cache for that group and will get the most recent version of processed resources.</p>
 * 
 * <p>Example of request handled by this handler: <code>/wro/zengarden.css?disableCache=true</code></p>
 */
public class DisableCacheRequestHandler extends RequestHandlerSupport {
    private static final Logger LOG = LoggerFactory.getLogger(DisableCacheRequestHandler.class);
    /**
     * The alias of this {@link RequestHandler} used for configuration.
     */
    public static final String ALIAS = "disableCache";
    private static final String PARAM_DISABLE_CACHE = ALIAS;
    @Inject
    private CacheStrategy<CacheKey, CacheValue> cacheStrategy;
    @Inject
    private GroupExtractor groupExtractor;
    @Inject
    private ReadOnlyContext context;

    @Override
    public void handle(final HttpServletRequest request, final HttpServletResponse response) throws IOException {
        final String requestUri = request.getRequestURI();

        final String groupName = groupExtractor.getGroupName(request);
        final ResourceType resourceType = groupExtractor.getResourceType(request);
        final boolean isMinimized = groupExtractor.isMinimized(request);

        final CacheKey cacheKey = new CacheKey(groupName, resourceType, isMinimized);
        LOG.debug("invalidating cacheKey: {}", cacheKey);
        cacheStrategy.put(cacheKey, null);

        final RequestDispatcher dispatcher = request.getRequestDispatcher(requestUri);
        try {
            // required to avoid stackoverflow exception (when the request is handled by the same requestHandler more then once).
            markAsHandled(request);
            dispatcher.forward(request, response);
        } catch (final ServletException e) {
            throw new IOException(e);
        }
    }

    private void markAsHandled(final HttpServletRequest request) {
        request.setAttribute(DisableCacheRequestHandler.class.getName(), true);
    }

    private boolean wasHandled(final HttpServletRequest request) {
        return request.getAttribute(DisableCacheRequestHandler.class.getName()) != null;
    }

    @Override
    public boolean accept(final HttpServletRequest request) {
        final String disableCacheAsString = request.getParameter(PARAM_DISABLE_CACHE);
        return BooleanUtils.toBoolean(disableCacheAsString) && !wasHandled(request);
    }

    @Override
    public boolean isEnabled() {
        return context.getConfig().isDebug();
    }
}
