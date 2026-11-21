package com.invisibledesktop.backend.youtube;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.HtmlUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class YouTubeService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(30);

    private record CacheEntry(List<VideoResult> results, Instant expiresAt) {}

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final RestClient restClient;
    private final String apiKey;

    public YouTubeService(@Value("${youtube.api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl("https://www.googleapis.com/youtube/v3")
                .build();
    }

    public List<VideoResult> search(String query, int limit) {
        String key = query.trim().toLowerCase() + ":" + limit;

        CacheEntry cached = cache.get(key);
        if (cached != null && Instant.now().isBefore(cached.expiresAt())) {
            return cached.results();
        }

        List<VideoResult> results = fetchFromYouTube(query, limit);
        cache.put(key, new CacheEntry(results, Instant.now().plus(CACHE_TTL)));
        return results;
    }

    private List<VideoResult> fetchFromYouTube(String query, int limit) {
        YouTubeSearchResponse response;
        try {
            response = restClient.get()
                    .uri(uri -> uri.path("/search")
                            .queryParam("part", "snippet")
                            .queryParam("type", "video")
                            .queryParam("videoEmbeddable", "true")
                            .queryParam("maxResults", limit)
                            .queryParam("q", query)
                            .queryParam("regionCode", "IN")
                            .queryParam("relevanceLanguage", "en")
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .body(YouTubeSearchResponse.class);
        } catch (RestClientException e) {
            throw new YouTubeApiException("YouTube search failed", e);
        }

        if (response == null || response.items() == null) {
            return List.of();
        }

        return response.items().stream()
                .map(item -> new VideoResult(
                        item.id().videoId(),
                        HtmlUtils.htmlUnescape(item.snippet().title()),
                        item.snippet().channelTitle(),
                        item.snippet().thumbnails().medium().url()))
                .toList();
    }
}