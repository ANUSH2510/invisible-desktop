package com.invisibledesktop.backend.youtube;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/youtube")
public class YouTubeController {

    private final YouTubeService youTubeService;

    public YouTubeController(YouTubeService youTubeService) {
        this.youTubeService = youTubeService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<VideoResult>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit) {

        if (q.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        int safeLimit = Math.max(1, Math.min(limit, 10));
        return ResponseEntity.ok(youTubeService.search(q, safeLimit));
    }
}
