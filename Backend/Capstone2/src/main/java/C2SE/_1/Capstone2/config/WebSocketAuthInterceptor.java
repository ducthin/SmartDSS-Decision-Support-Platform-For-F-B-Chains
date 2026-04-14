package C2SE._1.Capstone2.config;

import C2SE._1.Capstone2.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String ANON_WS_KEY = "smartdss-ws-anon";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    private static boolean isAnonymousWsUser(Principal principal) {
        return principal == null
                || principal instanceof AnonymousAuthenticationToken
                || (principal instanceof UsernamePasswordAuthenticationToken up
                        && "anonymous".equals(up.getPrincipal()));
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    if (jwtTokenProvider.validateToken(token)) {
                        String username = jwtTokenProvider.getUsernameFromToken(token);
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        accessor.setUser(auth);
                        log.debug("WebSocket authenticated: {}", username);
                    } else {
                        attachAnonymousGuest(accessor, "invalid JWT");
                    }
                } catch (Exception e) {
                    log.debug("WebSocket CONNECT: JWT failed ({}), using anonymous guest", e.getMessage());
                    attachAnonymousGuest(accessor, "jwt error");
                }
            } else {
                attachAnonymousGuest(accessor, "no Authorization header");
            }
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination == null) {
                return message;
            }

            Principal user = accessor.getUser();
            boolean anon = isAnonymousWsUser(user);

            if (destination.startsWith("/topic/qr-orders/")) {
                // Kênh realtime riêng cho khách QR theo session.
                return message;
            }

            if (destination.startsWith("/topic/orders")) {
                // Kênh nghiệp vụ nội bộ (nhân viên) - anonymous không được nghe.
                if (anon) {
                    throw new AccessDeniedException("Authentication required to subscribe to /topic/orders");
                }
                return message;
            }

            if (destination.startsWith("/topic/staff-calls")
                    || destination.startsWith("/topic/feedbacks")
                    || destination.startsWith("/topic/feedback-alerts")) {
                if (anon) {
                    throw new AccessDeniedException("Authentication required to subscribe to protected topic");
                }
            }
        }

        return message;
    }

    private void attachAnonymousGuest(StompHeaderAccessor accessor, String reason) {
        AnonymousAuthenticationToken guest = new AnonymousAuthenticationToken(
                ANON_WS_KEY,
                "anonymous",
                AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));
        accessor.setUser(guest);
        log.debug("WebSocket CONNECT as anonymous guest ({})", reason);
    }
}
