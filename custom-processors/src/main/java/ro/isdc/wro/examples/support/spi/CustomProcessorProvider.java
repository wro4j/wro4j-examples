package ro.isdc.wro.examples.support.spi;

import java.util.HashMap;
import java.util.Map;

import ro.isdc.wro.examples.support.processor.CustomCssUrlRewritingProcessor;
import ro.isdc.wro.model.resource.processor.ResourceProcessor;
import ro.isdc.wro.model.resource.processor.support.ProcessorProvider;


/**
 * Registers custom processors using SPI provider.
 *
 * @author Alex Objelean
 */
public class CustomProcessorProvider
    implements ProcessorProvider {
  @Override
  public Map<String, ResourceProcessor> providePreProcessors() {
    final Map<String, ResourcePreProcessor> map = new HashMap<String, ResourcePreProcessor>();
    map.put(CustomCssUrlRewritingProcessor.ALIAS, new CustomCssUrlRewritingProcessor());
    return map;
  }

  @Override
  public Map<String, ResourcePostProcessor> providePostProcessors() {
    final Map<String, ResourcePostProcessor> map = new HashMap<String, ResourcePostProcessor>();
    map.put(CustomCssUrlRewritingProcessor.ALIAS, new CustomCssUrlRewritingProcessor());
    return map;
  }
}
