package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.StaffCallSoundSettingDTO;
import C2SE._1.Capstone2.service.AppSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private static final String STAFF_CALL_SOUND_KEY = "staff_call_sound_url";
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/ogg"
    );
    private static final long MAX_SOUND_BYTES = 5L * 1024 * 1024; // 5MB

    private final AppSettingService appSettingService;

    @GetMapping("/staff-call-sound")
    public ResponseEntity<ApiResponse<StaffCallSoundSettingDTO>> getStaffCallSound() {
        String url = appSettingService.getValue(STAFF_CALL_SOUND_KEY);
        return ResponseEntity.ok(ApiResponse.success(StaffCallSoundSettingDTO.builder().soundUrl(url).build()));
    }

    @PostMapping(value = "/staff-call-sound", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<StaffCallSoundSettingDTO>> uploadStaffCallSound(@RequestPart("file") MultipartFile file)
            throws IOException {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("File âm thanh không hợp lệ"));
        }
        if (file.getSize() > MAX_SOUND_BYTES) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("File quá lớn (tối đa 5MB)"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Chỉ hỗ trợ file âm thanh (mp3/wav/ogg)"));
        }

        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "sound" : file.getOriginalFilename());
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot).toLowerCase();
        }
        if (ext.isBlank()) {
            ext = contentType.contains("wav") ? ".wav" : ".mp3";
        }

        Path uploadDir = Paths.get("uploads", "sounds");
        Files.createDirectories(uploadDir);

        String filename = "staff-call-" + UUID.randomUUID() + ext;
        Path target = uploadDir.resolve(filename);
        Files.write(target, file.getBytes());

        String url = "/uploads/sounds/" + filename;
        appSettingService.setValue(STAFF_CALL_SOUND_KEY, url);

        return ResponseEntity.ok(ApiResponse.success(StaffCallSoundSettingDTO.builder().soundUrl(url).build()));
    }

    @DeleteMapping("/staff-call-sound")
    public ResponseEntity<ApiResponse<StaffCallSoundSettingDTO>> clearStaffCallSound() {
        appSettingService.setValue(STAFF_CALL_SOUND_KEY, null);
        return ResponseEntity.ok(ApiResponse.success(StaffCallSoundSettingDTO.builder().soundUrl(null).build()));
    }
}

